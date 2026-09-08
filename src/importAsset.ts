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

export async function prepareImport(uri: string, fileName: string): Promise<PreparedImport> {
  if (!fileName.toLowerCase().endsWith('.zip')) {
    return { csvText: await FileSystem.readAsStringAsync(uri), photoUris: {} };
  }

  const archiveBase64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  const archive = await JSZip.loadAsync(archiveBase64, { base64: true });
  const entries = Object.values(archive.files).filter((entry) => !entry.dir);
  const csvEntry = entries.find((entry) => entry.name.toLowerCase().endsWith('.csv'));
  if (!csvEntry) throw new Error('Cette archive ne contient aucun fichier CSV.');

  const csvText = await csvEntry.async('string');
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
