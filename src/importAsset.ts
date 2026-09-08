import * as FileSystem from 'expo-file-system/legacy';
import JSZip from 'jszip';
import { Platform } from 'react-native';

export type PreparedImport = {
  csvText: string;
  photoUris: Record<string, string>;
};

const imageMime = (name: string) => {
  const extension = name.split('.').pop()?.toLowerCase();
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  return 'image/jpeg';
};

const baseName = (path: string) => path.split('/').pop() ?? path;

const isZipContent = (base64: string) => base64.startsWith('UEs');

function ensureCsvText(csvText: string) {
  if (!csvText.trim()) throw new Error('Le fichier est vide. Choisis un CSV contenant au moins une ligne.');

  // A binary file incorrectly labelled as a CSV would otherwise leave the import
  // screen in an unusable state without explaining what happened.
  if (/[\u0000-\u0008\u000E-\u001F]/.test(csvText)) {
    throw new Error('Ce fichier n’est ni un CSV lisible ni une archive ZIP. Télécharge à nouveau le ZIP depuis Google Drive puis sélectionne-le.');
  }
}

export async function prepareImport(uri: string, fileName: string): Promise<PreparedImport> {
  let archiveBase64: string;
  try {
    archiveBase64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  } catch {
    throw new Error('Le fichier sélectionné ne peut pas être lu. Réessaie après l’avoir téléchargé sur l’appareil.');
  }

  // Google Drive and some Android file providers expose downloaded ZIP files as
  // application/octet-stream and may omit the .zip suffix. Detect the archive
  // from its signature instead of trusting the provider's filename.
  if (!fileName.toLowerCase().endsWith('.zip') && !isZipContent(archiveBase64)) {
    const csvText = await FileSystem.readAsStringAsync(uri);
    ensureCsvText(csvText);
    return { csvText, photoUris: {} };
  }

  let archive: JSZip;
  try {
    archive = await JSZip.loadAsync(archiveBase64, { base64: true });
  } catch {
    throw new Error('Cette archive ZIP est endommagée ou incomplète. Télécharge-la à nouveau depuis Google Drive avant de l’importer.');
  }
  const entries = Object.values(archive.files).filter((entry) => !entry.dir);
  const csvEntry = entries.find((entry) => entry.name.toLowerCase().endsWith('.csv'));
  if (!csvEntry) throw new Error('Cette archive ne contient aucun fichier CSV.');

  const csvText = await csvEntry.async('string');
  ensureCsvText(csvText);
  const photoUris: Record<string, string> = {};
  const images = entries.filter((entry) => /\.(jpe?g|png|webp)$/i.test(entry.name));
  const destinationDirectory = `${FileSystem.documentDirectory ?? FileSystem.cacheDirectory}imports/${Date.now()}/`;
  if (Platform.OS !== 'web') await FileSystem.makeDirectoryAsync(destinationDirectory, { intermediates: true });

  for (let index = 0; index < images.length; index += 1) {
    const entry = images[index];
    const name = baseName(entry.name);
    const content = await entry.async('base64');
    let destination: string;
    if (Platform.OS === 'web') {
      destination = `data:${imageMime(name)};base64,${content}`;
    } else {
      const extension = name.split('.').pop()?.toLowerCase() || 'jpg';
      destination = `${destinationDirectory}${index}.${extension}`;
      await FileSystem.writeAsStringAsync(destination, content, { encoding: FileSystem.EncodingType.Base64 });
    }
    photoUris[name] = destination;
    photoUris[entry.name] = destination;
  }

  return { csvText, photoUris };
}
