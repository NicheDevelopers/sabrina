// Zip the audio-files directory and export the database to a file, into one zip
async function exportDb() {
  console.log("Exporting database...");
  const audioDir = "./audio-files";
  const dbFile = "./sabrina.db";
  const outputZip = "./nichebot_export.zip";
  const command = new Deno.Command(
    "zip",
    {
      args: ["-r", outputZip, audioDir, dbFile],
      stdout: "piped",
      stderr: "piped",
    },
  );
  const { code, stdout, stderr } = await command.output();
  if (code !== 0) {
    console.error(`zip command failed with code ${code}: ${new TextDecoder().decode(stderr)}`);
    return;
  }
  console.log(new TextDecoder().decode(stdout));
}

await exportDb();