import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const fever = JSON.parse(
  readFileSync('electron-builder.fever.json', 'utf8')
) as {
  appId: string;
  productName: string;
  publish: null;
  extraMetadata: { name: string };
  directories: { output: string };
  win: { target: string[]; artifactName: string };
  mac: { target: string[] };
  linux: { target: string[] };
};

describe('desktop release isolation', () => {
  it('keeps cabinet updater asset patterns edition-specific', () => {
    const classicPattern = /^Fast[ .-]Drop[ .-](?<version>\d+\.\d+\.\d+)\.exe$/;
    const feverPattern =
      /^Fast[ .-]Drop[ .-]Fever[ .-](?<version>\d+\.\d+\.\d+)\.exe$/;
    const feverName = fever.win.artifactName
      .replace('${version}', '0.1.0')
      .replace('${ext}', 'exe');

    expect(feverName).toBe('Fast.Drop.Fever.0.1.0.exe');
    expect(classicPattern.exec('Fast.Drop.0.1.0.exe')?.groups?.version).toBe(
      '0.1.0'
    );
    expect(classicPattern.test(feverName)).toBe(false);
    expect(feverPattern.exec(feverName)?.groups?.version).toBe('0.1.0');
    expect(feverPattern.test('Fast.Drop.0.1.0.exe')).toBe(false);
  });

  it('uses separate identity/output and no updater metadata or installer', () => {
    expect(fever.appId).toBe('com.fastdrop.fever');
    expect(fever.productName).toBe('Fast Drop Fever');
    expect(fever.extraMetadata.name).toBe('fast-drop-fever');
    expect(fever.directories.output).toBe('dist_electron_fever');
    expect(fever.publish).toBeNull();
    expect(fever.win.target).toEqual(['portable']);
    expect(fever.mac.target).toEqual(['dmg', 'zip']);
    expect(fever.linux.target).toEqual(['AppImage', 'tar.gz']);
  });
});
