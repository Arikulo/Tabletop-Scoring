const setNamesBtn = document.getElementById('set-names');
const useSavedBtn = document.getElementById('use-saved');
const resetAllBtn = document.getElementById('reset-all');
const playerCountInput = document.getElementById('player-count');
const namesWrapper = document.getElementById('names-wrapper');
const namesForm = document.getElementById('names-form');
const setupError = document.getElementById('setup-error');

const roundsPanel = document.getElementById('rounds-panel');
const roundForm = document.getElementById('round-form');
const roundError = document.getElementById('round-error');
const addRoundBtn = document.getElementById('add-round');
const undoRoundBtn = document.getElementById('undo-round');
const roundsCount = document.getElementById('rounds-count');

const tablePanel = document.getElementById('table-panel');
const scoreTable = document.getElementById('score-table');
const liveTotal = document.getElementById('live-total');

let players = [];
const STORAGE_KEY = 'scorekeeper:names';

function attachEnterAdvance(container, selector, onLastAction) {
	container.addEventListener('keydown', event => {
		if (event.key !== 'Enter') return;
		const inputs = [...container.querySelectorAll(selector)];
		const currentIndex = inputs.indexOf(event.target);
		if (currentIndex === -1) return;
		event.preventDefault();
		event.stopPropagation();
		const next = inputs[currentIndex + 1];
		if (next) {
			next.focus();
			if (typeof next.select === 'function') next.select();
		} else if (typeof onLastAction === 'function') {
			onLastAction();
		}
	});
}

function saveNamesToStorage(names) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(names));
	} catch (err) {
		console.warn('Could not save names', err);
	}
}

function getSavedNames() {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed.filter(n => typeof n === 'string' && n.trim().length > 0) : [];
	} catch (err) {
		console.warn('Could not read saved names', err);
		return [];
	}
}

function showSetupError(message) {
	setupError.textContent = message;
	setupError.classList.toggle('hidden', !message);
}

function showRoundError(message) {
	roundError.textContent = message;
	roundError.classList.toggle('hidden', !message);
}

function buildNameFields(count) {
	namesForm.innerHTML = '';
	for (let i = 0; i < count; i++) {
		const wrapper = document.createElement('div');
		wrapper.innerHTML = `
			<label for="player-${i}">Player ${i + 1}</label>
			<input id="player-${i}" type="text" name="player-${i}" placeholder="Name" required>
		`;
		namesForm.appendChild(wrapper);
	}

	const submit = document.createElement('div');
	submit.className = 'controls';
	submit.innerHTML = '<button type="submit">Create scoreboard</button>';
	namesForm.appendChild(submit);
}

function resetGame() {
	players = [];
	namesWrapper.classList.add('hidden');
	roundsPanel.classList.add('hidden');
	tablePanel.classList.add('hidden');
	playerCountInput.value = '';
	namesForm.innerHTML = '';
	roundForm.innerHTML = '';
	scoreTable.innerHTML = '';
	liveTotal.textContent = '';
	roundsCount.textContent = '0 rounds logged';
	showSetupError('');
	showRoundError('');
}

function initializePlayers() {
	const inputs = [...namesForm.querySelectorAll('input[type="text"]')];
	const names = inputs.map(input => input.value.trim());

	if (names.some(n => n.length === 0)) {
		showSetupError('Please fill in every player name.');
		return;
	}

	players = names.map(name => ({ name, scores: [] }));
	saveNamesToStorage(names);

	namesWrapper.classList.add('hidden');
	roundsPanel.classList.remove('hidden');
	tablePanel.classList.remove('hidden');
	buildRoundInputs();
	renderTable();
	showSetupError('');
}

function loadSavedNames() {
	const saved = getSavedNames();
	if (!saved.length) {
		showSetupError('No saved names yet. Set players once to save them.');
		namesWrapper.classList.add('hidden');
		return;
	}
	playerCountInput.value = saved.length;
	buildNameFields(saved.length);
	namesWrapper.classList.remove('hidden');
	saved.forEach((name, i) => {
		const input = namesForm.querySelector(`#player-${i}`);
		if (input) input.value = name;
	});
	showSetupError('');
}

function buildRoundInputs() {
	roundForm.innerHTML = '';
	players.forEach((player, index) => {
		const wrapper = document.createElement('div');
		wrapper.innerHTML = `
			<label for="score-${index}">${player.name}'s score</label>
			<input id="score-${index}" type="number" inputmode="numeric" step="1" value="0" required>
		`;
		roundForm.appendChild(wrapper);
	});
}

function addRound() {
	if (!players.length) return;
	const inputs = [...roundForm.querySelectorAll('input[type="number"]')];
	const scores = inputs.map(input => {
		const raw = input.value.trim();
		return raw === '' ? 0 : parseInt(raw, 10) || 0;
	});

	scores.forEach((score, i) => players[i].scores.push(score));
	renderTable();
	showRoundError('');
	inputs.forEach(input => input.value = '0');
	if (inputs.length > 0) {
		inputs[0].focus();
		inputs[0].select();
	}
}

function removePlayer(index) {
	if (index < 0 || index >= players.length) return;
	players.splice(index, 1);
	if (!players.length) {
		resetGame();
		return;
	}
	saveNamesToStorage(players.map(p => p.name));
	buildRoundInputs();
	renderTable();
}

function undoRound() {
	const rounds = players[0]?.scores.length || 0;
	if (rounds === 0) {
		showRoundError('No rounds to undo.');
		return;
	}
	players.forEach(p => p.scores.pop());
	renderTable();
	showRoundError('');
}

function renderTable() {
	const rounds = players[0]?.scores.length || 0;
	roundsCount.textContent = rounds === 1 ? '1 round logged' : `${rounds} rounds logged`;

	if (!players.length) {
		scoreTable.innerHTML = '';
		liveTotal.textContent = '';
		return;
	}

	const totals = players.map(p => p.scores.reduce((a, b) => a + b, 0));
	const grandTotal = totals.reduce((a, b) => a + b, 0);
	const maxTotal = Math.max(...totals);
	liveTotal.textContent = `Total points on the table: ${grandTotal}`;

	const header = `
		<thead>
			<tr>
				<th>Round</th>
				${players.map((p, i) => `<th class="${totals[i] === maxTotal ? 'highest' : ''}">${p.name}<button class="remove-player" data-index="${i}" aria-label="Remove ${p.name}">×</button></th>`).join('')}
			</tr>
		</thead>
	`;

	const bodyRows = [];
	for (let r = 0; r < rounds; r++) {
		const cells = players.map(p => `<td>${p.scores[r]}</td>`).join('');
		bodyRows.push(`<tr><td>${r + 1}</td>${cells}</tr>`);
	}

	const body = `<tbody>${bodyRows.join('') || '<tr><td colspan="100%" style="text-align:left; color: var(--muted);">No rounds yet. Add your first scores above.</td></tr>'}</tbody>`;

	const footer = `
		<tfoot>
			<tr>
				<th>Totals</th>
				${totals.map(total => `<td class="${total === maxTotal ? 'highest' : ''}">${total}</td>`).join('')}
			</tr>
		</tfoot>
	`;

	scoreTable.innerHTML = `${header}${body}${footer}`;
}

setNamesBtn.addEventListener('click', () => {
	const count = parseInt(playerCountInput.value, 10);
	if (!Number.isInteger(count) || count < 1 || count > 12) {
		showSetupError('Enter a player count between 1 and 12.');
		namesWrapper.classList.add('hidden');
		return;
	}
	buildNameFields(count);
	namesWrapper.classList.remove('hidden');
	showSetupError('');
});

useSavedBtn.addEventListener('click', loadSavedNames);

namesForm.addEventListener('submit', event => {
	event.preventDefault();
	initializePlayers();
});

attachEnterAdvance(namesForm, 'input[type="text"]', initializePlayers);

addRoundBtn.addEventListener('click', () => {
	if (!players.length) {
		showRoundError('Set up players first.');
		return;
	}
	addRound();
});

undoRoundBtn.addEventListener('click', undoRound);
resetAllBtn.addEventListener('click', resetGame);

scoreTable.addEventListener('click', event => {
	const target = event.target;
	if (!(target instanceof HTMLElement)) return;
	if (target.classList.contains('remove-player')) {
		const index = Number(target.dataset.index);
		if (Number.isInteger(index)) {
			removePlayer(index);
		}
	}
});

// Keyboard submit for round form mirrors the add round button.
roundForm.addEventListener('submit', event => {
	event.preventDefault();
	addRound();
});

attachEnterAdvance(roundForm, 'input[type="number"]', addRound);
