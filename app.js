let web3, contract, account;
let chart;

function setStatus(message, kind = "neutral") {
    const el = document.getElementById("status");
    el.className = "status-bar";
    if (kind === "ok") el.classList.add("status-ok");
    else if (kind === "err") el.classList.add("status-err");
    else if (kind === "wait") el.classList.add("status-wait");
    el.textContent = message || "";
}

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

// contractAddress and ABI: contract-config.js (include before app.js)

async function connectWallet() {
    web3 = new Web3(window.ethereum);

    await window.ethereum.request({ method: "eth_requestAccounts" });

    const accounts = await web3.eth.getAccounts();
    account = accounts[0];

    const addrEl = document.getElementById("walletAddress");
    addrEl.textContent = `${account.slice(0, 6)}…${account.slice(-4)}`;
    addrEl.title = account;

    loadContract();
}

function loadContract() {
    contract = new web3.eth.Contract(ABI, contractAddress);
    loadCandidates();
}

async function verifyUser() {
    try {
        setStatus("Verifying on-chain…", "wait");

        await contract.methods.verifyVoter(account).send({ from: account });

        setStatus("Voter verified. You may cast a vote.", "ok");
    } catch (e) {
        setStatus(e.message || "Verification failed.", "err");
    }
}

async function loadCandidates() {
    try {
        const data = await contract.methods.getCandidates().call();

        console.log("Candidates:", data);

        let container = document.getElementById("candidates");
        container.innerHTML = "";

        data.forEach((c, i) => {
            const name = escapeHtml(c.name);
            container.innerHTML += `
            <div class="col-lg-4 col-md-6">
                <article class="candidate-card">
                    <div class="candidate-card__top">
                        <div>
                            <span class="candidate-card__index">Ballot ${i + 1}</span>
                            <h3>${name}</h3>
                        </div>
                    </div>
                    <p class="candidate-card__votes">Current tally: <strong>${c.voteCount}</strong> votes</p>
                    <button type="button" class="btn-vote" onclick="vote(${i})">Cast vote</button>
                </article>
            </div>
            `;
        });

        renderChart(data);

    } catch (err) {
        console.error(err);
    }
}

async function vote(i) {
    try {
        setStatus("Submitting vote…", "wait");

        await contract.methods.vote(i).send({ from: account });

        setStatus("Vote recorded successfully.", "ok");
        loadCandidates();

    } catch (e) {
        setStatus(e.message || "Vote failed.", "err");
    }
}

function renderChart(data) {
    const names = data.map(c => c.name);
    const votes = data.map(c => c.voteCount);
    const barColors = names.map((_, i) => {
        const hue = 158 + (i * 42) % 120;
        return `hsla(${hue}, 62%, 52%, 0.85)`;
    });
    const borderColors = names.map((_, i) => {
        const hue = 158 + (i * 42) % 120;
        return `hsla(${hue}, 62%, 62%, 1)`;
    });

    const ctx = document.getElementById("chart");

    if (chart) chart.destroy();

    const muted = "#8b93a7";
    const grid = "rgba(139, 147, 167, 0.12)";

    chart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: names,
            datasets: [{
                label: "Votes",
                data: votes,
                backgroundColor: barColors,
                borderColor: borderColors,
                borderWidth: 1,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    labels: { color: muted, font: { family: "'DM Sans', sans-serif", size: 12 } }
                }
            },
            scales: {
                x: {
                    ticks: { color: muted, font: { family: "'DM Sans', sans-serif" } },
                    grid: { color: grid }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: muted,
                        font: { family: "'DM Sans', sans-serif" },
                        precision: 0
                    },
                    grid: { color: grid }
                }
            }
        }
    });
}

setInterval(() => {
    if (contract) loadCandidates();
}, 5000);