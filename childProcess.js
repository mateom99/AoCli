import fs from "fs";

process.send({ status: "ready" });

process.on("message", async (msg) => {
  let { cmd, funcPath, parsePath, inputPath } = msg;

  const inputFile = fs.readFileSync(inputPath, "utf8").toString().trim();

  if (cmd === "start") {
    try {
      // console.log("child process started");

      const { solve } = await import(funcPath);
      const { parse } = await import(parsePath);
      const input = parse(inputFile);
      const start = performance.now();
      const result = solve(input); // Execute part1 with provided input
      const end = performance.now();
      const time = end - start;
      process.send({ status: "success", result, time }); // Send the result back to the main script
    } catch (error) {
      throw error;
      process.send({ status: "error", error: error.message }); // Send error if any
    }
  }
});
