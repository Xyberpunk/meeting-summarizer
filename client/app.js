const transcriptInput = document.getElementById("transcriptInput");
const summarizeBtn = document.getElementById("summarizeBtn");
const charCounter = document.getElementById("charCounter");

const errorBox = document.getElementById("errorBox");
const emptyState = document.getElementById("emptyState");
const summaryBox = document.getElementById("summaryBox");
const usageBox = document.getElementById("usageBox");
const modelChip = document.getElementById("modelChip");

function setHidden(el, hidden) {
  el.classList.toggle("hidden", hidden);
}

function updateCounter() {
  const len = transcriptInput.value.length;
  charCounter.textContent = `${len} chars`;
  charCounter.classList.toggle("warn", len < 20);
  summarizeBtn.disabled = len < 20;
}

transcriptInput.addEventListener("input", updateCounter);
updateCounter();

summarizeBtn.addEventListener("click", async () => {
  const transcript = transcriptInput.value.trim();
  if (transcript.length < 20) return;

  summarizeBtn.disabled = true;
  summarizeBtn.textContent = "Summarizing...";

  setHidden(errorBox, true);
  setHidden(summaryBox, true);
  setHidden(usageBox, true);
  setHidden(modelChip, true);
  setHidden(emptyState, true);
  summaryBox.textContent = "";

  try {
    const res = await fetch("http://localhost:8080/api/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");

    summaryBox.textContent = data.summary;
    setHidden(summaryBox, false);

    if (data.model) {
      modelChip.textContent = data.model;
      setHidden(modelChip, false);
    }

    if (data.usage) {
      const u = data.usage;
      usageBox.textContent =
        `Tokens: prompt ${u.prompt_tokens}, completion ${u.completion_tokens}, total ${u.total_tokens}`;
      setHidden(usageBox, false);
    }
  } catch (err) {
    errorBox.textContent = err.message;
    setHidden(errorBox, false);
    setHidden(emptyState, false);
  } finally {
    summarizeBtn.textContent = "Summarize";
    summarizeBtn.disabled = transcriptInput.value.length < 20;
  }
});
