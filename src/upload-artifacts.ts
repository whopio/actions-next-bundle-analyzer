import { DefaultArtifactClient } from '@actions/artifact';
import * as fs from 'fs';
import * as tmp from 'tmp';

type ArtifactFile = {
  fileName: string;
  data: any;
};

export async function uploadJsonAsArtifact(
  artifactName: string,
  artifactFiles: ArtifactFile[],
): Promise<void> {
  const artifactClient = new DefaultArtifactClient();

  const dir = tmp.dirSync();
  const filenames = artifactFiles.map(({ fileName, data }) => {
    const file = tmp.fileSync({ name: fileName, dir: dir.name });
    fs.writeFileSync(file.name, JSON.stringify(data, null, 2));
    return file.name;
  });

  console.log(`Uploading ${filenames.join(', ')}`);
  const response = await artifactClient.uploadArtifact(artifactName, filenames, dir.name);
  console.log('Artifact uploaded', response);
}
