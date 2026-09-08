async function run() {
  console.log("Fetching models...");
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GOOGLE_GENERATIVE_AI_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.models) {
    console.log(data.models.map(m => m.name));
  } else {
    console.log(data);
  }
}
run();
