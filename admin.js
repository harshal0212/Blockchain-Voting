let web3;
let contract;
let account;
let contractOwner = null;

function setAdminStatus(message, kind = "neutral") {
    const el = document.getElementById("adminStatus");
    if (!el) return;
    el.className = "status-bar admin-status-top";
    if (kind === "ok") el.classList.add("status-ok");
    else if (kind === "err") el.classList.add("status-err");
    else if (kind === "wait") el.classList.add("status-wait");
    el.textContent = message || "";
}

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
}

function shortAddr(a) {
    if (!a || a.length < 10) return a || "";
    return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function parseTxError(err) {
    const msg = err && err.message ? err.message : String(err);
    const json = err && err.cause && err.cause.message;
    const combined = json ? `${msg} ${json}` : msg;
    const revert = combined.match(/reverted with reason string\s*'([^']+)'/i)
        || combined.match(/execution reverted:\s*(.+)/i)
        || combined.match(/VM Exception[^:]*:\s*(.+)/i);
    if (revert) return revert[1].trim();
    if (combined.length > 200) return combined.slice(0, 200) + "…";
    return combined;
}

function setControlsEnabled(isOwner) {
    const addBtn = document.getElementById("btnAddCandidate");
    const toggleBtn = document.querySelector(".btn-admin-toggle");
    const connectBtn = document.getElementById("btnAdminConnect");
    if (addBtn) addBtn.disabled = !isOwner;
    if (toggleBtn) toggleBtn.disabled = !isOwner;
    document.querySelectorAll(".btn-admin-remove").forEach((b) => {
        b.disabled = !isOwner || b.dataset.hasVotes === "1";
    });
    if (connectBtn) connectBtn.disabled = false;
}

function updateVotingBadge(active) {
    const el = document.getElementById("votingStateBadge");
    if (!el) return;
    el.textContent = active ? "Open" : "Closed";
    el.className = "voting-state-badge " + (active ? "voting-state-open" : "voting-state-closed");
}

async function refreshBallot() {
    if (!contract || !account) return;

    let ownerAddr;
    try {
        ownerAddr = await contract.methods.owner().call();
        contractOwner = ownerAddr;
    } catch (e) {
        contractOwner = null;
        setAdminStatus(
            "This contract has no admin functions on-chain. Redeploy the updated Voting.sol from this project, then set the new address in contract-config.js.",
            "err"
        );
        document.getElementById("adminCandidateList").innerHTML = "";
        document.getElementById("adminEmptyBallot").hidden = false;
        updateVotingBadge(false);
        setControlsEnabled(false);
        return;
    }

    const isOwner = ownerAddr.toLowerCase() === account.toLowerCase();
    const hint = document.getElementById("adminOwnerHint");
    if (hint) {
        if (isOwner) {
            hint.hidden = true;
            hint.textContent = "";
        } else {
            hint.hidden = false;
            hint.textContent =
                `Only the deployer wallet (${shortAddr(ownerAddr)}) can add or remove candidates and toggle voting. You are connected as ${shortAddr(account)}.`;
        }
    }

    let votingActive = false;
    try {
        votingActive = await contract.methods.votingActive().call();
    } catch (_) {
        /* ignore */
    }
    updateVotingBadge(votingActive);

    let data;
    try {
        data = await contract.methods.getCandidates().call();
    } catch (e) {
        setAdminStatus(parseTxError(e), "err");
        return;
    }

    const list = document.getElementById("adminCandidateList");
    const empty = document.getElementById("adminEmptyBallot");
    list.innerHTML = "";

    if (!data || data.length === 0) {
        empty.hidden = false;
    } else {
        empty.hidden = true;
        data.forEach((c, i) => {
            const votes = Number(c.voteCount);
            const hasVotes = votes > 0;
            const li = document.createElement("li");
            li.className = "admin-candidate-row";
            li.innerHTML = `
                <div class="admin-candidate-info">
                    <span class="admin-candidate-index">#${i + 1}</span>
                    <span class="admin-candidate-name">${escapeHtml(c.name)}</span>
                    <span class="admin-candidate-votes">${votes} vote${votes === 1 ? "" : "s"}</span>
                </div>
                <button type="button" class="btn-admin-remove" data-index="${i}" data-has-votes="${hasVotes ? "1" : "0"}"
                    onclick="removeCandidate(${i})" title="${hasVotes ? "Cannot remove after votes exist" : "Remove from ballot"}">
                    Remove
                </button>
            `;
            list.appendChild(li);
        });
    }

    setControlsEnabled(isOwner);
}

async function setupAfterAccount() {
    if (typeof contractAddress === "undefined" || typeof ABI === "undefined") {
        setAdminStatus("Missing contract-config.js or contract settings.", "err");
        return;
    }

    web3 = new Web3(window.ethereum);
    contract = new web3.eth.Contract(ABI, contractAddress);

    const walletLine = document.getElementById("adminWalletLine");
    const connectBtn = document.getElementById("btnAdminConnect");
    if (walletLine) {
        walletLine.textContent = `Connected: ${shortAddr(account)}`;
        walletLine.title = account;
    }
    if (connectBtn) connectBtn.hidden = true;

    setAdminStatus("", "neutral");
    await refreshBallot();
}

async function adminConnect() {
    if (!window.ethereum) {
        setAdminStatus("No Ethereum wallet found. Install MetaMask (or similar) and reload.", "err");
        return;
    }

    try {
        setAdminStatus("Connecting…", "wait");
        web3 = new Web3(window.ethereum);
        await window.ethereum.request({ method: "eth_requestAccounts" });
        const accounts = await web3.eth.getAccounts();
        account = accounts[0];
        if (!account) {
            setAdminStatus("No account selected.", "err");
            return;
        }
        await setupAfterAccount();
        setAdminStatus("Ready.", "ok");
    } catch (e) {
        setAdminStatus(parseTxError(e), "err");
    }
}

async function addCandidate() {
    const input = document.getElementById("candidateName");
    const name = (input && input.value ? input.value : "").trim();
    if (!name) {
        setAdminStatus("Enter a candidate name.", "err");
        return;
    }
    if (!contract || !account) {
        setAdminStatus("Connect your wallet first.", "err");
        return;
    }

    try {
        setAdminStatus("Adding candidate…", "wait");
        await contract.methods.addCandidate(name).send({ from: account });
        if (input) input.value = "";
        setAdminStatus(`Added “${name}”.`, "ok");
        await refreshBallot();
    } catch (e) {
        setAdminStatus(parseTxError(e), "err");
    }
}

async function removeCandidate(index) {
    if (!contract || !account) {
        setAdminStatus("Connect your wallet first.", "err");
        return;
    }
    if (!window.confirm("Remove this candidate from the ballot?")) return;

    try {
        setAdminStatus("Removing candidate…", "wait");
        await contract.methods.removeCandidate(index).send({ from: account });
        setAdminStatus("Candidate removed.", "ok");
        await refreshBallot();
    } catch (e) {
        setAdminStatus(parseTxError(e), "err");
    }
}

async function toggleVoting() {
    if (!contract || !account) {
        setAdminStatus("Connect your wallet first.", "err");
        return;
    }

    try {
        setAdminStatus("Updating voting status…", "wait");
        await contract.methods.toggleVoting().send({ from: account });
        setAdminStatus("Voting status updated.", "ok");
        await refreshBallot();
    } catch (e) {
        setAdminStatus(parseTxError(e), "err");
    }
}

async function tryAutoConnect() {
    if (!window.ethereum) {
        document.getElementById("adminWalletLine").textContent =
            "Install a browser wallet (e.g. MetaMask) to use the admin panel.";
        document.getElementById("btnAdminConnect").hidden = false;
        return;
    }

    try {
        web3 = new Web3(window.ethereum);
        const accounts = await web3.eth.getAccounts();
        if (accounts.length > 0) {
            account = accounts[0];
            await setupAfterAccount();
        } else {
            document.getElementById("adminWalletLine").textContent = "Connect the wallet that deployed the contract.";
        }
    } catch (e) {
        setAdminStatus(parseTxError(e), "err");
    }
}

window.addEventListener("load", () => {
    tryAutoConnect();
    setInterval(() => {
        if (contract && account) refreshBallot();
    }, 5000);
});

if (window.ethereum && window.ethereum.on) {
    window.ethereum.on("accountsChanged", (accs) => {
        account = accs && accs[0];
        if (account) setupAfterAccount();
        else {
            contract = null;
            document.getElementById("adminWalletLine").textContent = "Connect the wallet that deployed the contract.";
            document.getElementById("btnAdminConnect").hidden = false;
            const list = document.getElementById("adminCandidateList");
            if (list) list.innerHTML = "";
            const empty = document.getElementById("adminEmptyBallot");
            if (empty) empty.hidden = false;
            updateVotingBadge(false);
            setAdminStatus("Wallet disconnected.", "err");
        }
    });
    window.ethereum.on("chainChanged", () => window.location.reload());
}
