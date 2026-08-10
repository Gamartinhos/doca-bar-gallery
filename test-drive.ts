import { uploadToDrive } from "./src/lib/google-drive";

async function run() {
  try {
    const text = "Hello world";
    const blob = new Blob([text], { type: "text/plain" });
    const file = new File([blob], "test.txt", { type: "text/plain" });
    
    console.log("Uploading...");
    const result = await uploadToDrive(file as any, "test.txt");
    console.log("Success:", result);
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
