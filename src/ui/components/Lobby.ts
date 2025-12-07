/**
 * Lobby Component
 * 
 * Provides the lobby screen for creating and joining online games.
 */

import { Room, Player, PieceColor } from '../../types';
import { Toast } from './Toast';

/**
 * Lobby mode - create or join
 */
type LobbyMode = 'select' | 'create' | 'join' | 'waiting';

/**
 * Lobby class for the online lobby screen
 */
export class Lobby {
  private container: HTMLElement;
  private lobbyElement: HTMLElement | null = null;
  private mode: LobbyMode = 'select';
  private roomCode: string = '';
  private playerName: string = '';
  private currentRoom: Room | null = null;
  private players: Player[] = [];

  // Event callbacks
  public onCreateRoom: ((playerName: string) => void) | null = null;
  public onJoinRoom: ((roomCode: string, playerName: string) => void) | null = null;
  public onReady: (() => void) | null = null;
  public onLeave: (() => void) | null = null;
  public onBack: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    
    // Try to load saved player name
    try {
      this.playerName = localStorage.getItem('chess-player-name') || '';
    } catch (e) {
      // Ignore localStorage errors
    }
  }

  /**
   * Renders the lobby
   */
  render(): void {
    this.container.innerHTML = '';

    this.lobbyElement = document.createElement('div');
    this.lobbyElement.className = 'lobby-container glass-card';

    switch (this.mode) {
      case 'select':
        this.renderModeSelection();
        break;
      case 'create':
        this.renderCreateRoom();
        break;
      case 'join':
        this.renderJoinRoom();
        break;
      case 'waiting':
        this.renderWaitingRoom();
        break;
    }

    this.container.appendChild(this.lobbyElement);
  }

  /**
   * Renders the mode selection view
   */
  private renderModeSelection(): void {
    if (!this.lobbyElement) return;

    // Header with back button
    const header = this.createHeader('Jouer en ligne');
    this.lobbyElement.appendChild(header);

    // Mode selection cards
    const modeSelection = document.createElement('div');
    modeSelection.className = 'mode-selection';

    // Create Room card
    const createCard = document.createElement('div');
    createCard.className = 'mode-card glass-card';
    createCard.innerHTML = `
      <div class="mode-icon">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="16"/>
          <line x1="8" y1="12" x2="16" y2="12"/>
        </svg>
      </div>
      <div class="mode-title">Créer une salle</div>
      <div class="mode-description">Créez une nouvelle partie et invitez un ami</div>
    `;
    createCard.addEventListener('click', () => {
      this.showCreateRoom();
    });
    modeSelection.appendChild(createCard);

    // Join Room card
    const joinCard = document.createElement('div');
    joinCard.className = 'mode-card glass-card';
    joinCard.innerHTML = `
      <div class="mode-icon">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
          <polyline points="10 17 15 12 10 7"/>
          <line x1="15" y1="12" x2="3" y2="12"/>
        </svg>
      </div>
      <div class="mode-title">Rejoindre une salle</div>
      <div class="mode-description">Rejoignez une partie avec un code de salle</div>
    `;
    joinCard.addEventListener('click', () => {
      this.showJoinRoom();
    });
    modeSelection.appendChild(joinCard);

    this.lobbyElement.appendChild(modeSelection);
  }

  /**
   * Renders the create room view
   */
  private renderCreateRoom(): void {
    if (!this.lobbyElement) return;

    // Header
    const header = this.createHeader('Créer une salle', () => {
      this.mode = 'select';
      this.render();
    });
    this.lobbyElement.appendChild(header);

    // Form
    const form = document.createElement('div');
    form.className = 'join-form';

    // Player name input
    const nameLabel = document.createElement('label');
    nameLabel.className = 'settings-label';
    nameLabel.textContent = 'Votre nom';
    form.appendChild(nameLabel);

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'glass-input';
    nameInput.placeholder = 'Entrez votre nom';
    nameInput.value = this.playerName;
    nameInput.maxLength = 20;
    nameInput.addEventListener('input', (e) => {
      this.playerName = (e.target as HTMLInputElement).value;
    });
    form.appendChild(nameInput);

    // Create button
    const createBtn = document.createElement('button');
    createBtn.className = 'glass-button primary';
    createBtn.textContent = 'Créer la salle';
    createBtn.addEventListener('click', () => {
      if (!this.playerName.trim()) {
        Toast.warning('Veuillez entrer votre nom');
        return;
      }
      
      // Save player name
      try {
        localStorage.setItem('chess-player-name', this.playerName);
      } catch (e) {
        // Ignore
      }
      
      if (this.onCreateRoom) {
        this.onCreateRoom(this.playerName.trim());
      }
    });
    form.appendChild(createBtn);

    this.lobbyElement.appendChild(form);
  }

  /**
   * Renders the join room view
   */
  private renderJoinRoom(): void {
    if (!this.lobbyElement) return;

    // Header
    const header = this.createHeader('Rejoindre une salle', () => {
      this.mode = 'select';
      this.render();
    });
    this.lobbyElement.appendChild(header);

    // Form
    const form = document.createElement('div');
    form.className = 'join-form';

    // Room code input
    const codeLabel = document.createElement('label');
    codeLabel.className = 'settings-label';
    codeLabel.textContent = 'Code de la salle';
    form.appendChild(codeLabel);

    const codeInput = document.createElement('input');
    codeInput.type = 'text';
    codeInput.className = 'glass-input room-code-input';
    codeInput.placeholder = 'Entrez le code (ex: abc123-def456...)';
    codeInput.value = this.roomCode;
    codeInput.maxLength = 50;
    codeInput.style.fontSize = '14px';
    codeInput.style.letterSpacing = '0';
    codeInput.addEventListener('input', (e) => {
      const input = e.target as HTMLInputElement;
      // Keep lowercase for UUID format
      this.roomCode = input.value.trim();
    });
    form.appendChild(codeInput);

    // Paste button for easy pasting
    const pasteBtn = document.createElement('button');
    pasteBtn.type = 'button';
    pasteBtn.className = 'glass-button secondary';
    pasteBtn.style.marginTop = 'var(--spacing-sm)';
    pasteBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px;">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
      </svg>
      Coller le code
    `;
    pasteBtn.addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          codeInput.value = text.trim();
          this.roomCode = text.trim();
          Toast.success('Code collé !');
        }
      } catch (e) {
        Toast.error('Impossible d\'accéder au presse-papiers');
      }
    });
    form.appendChild(pasteBtn);

    // Player name input
    const nameLabel = document.createElement('label');
    nameLabel.className = 'settings-label';
    nameLabel.style.marginTop = 'var(--spacing-md)';
    nameLabel.textContent = 'Votre nom';
    form.appendChild(nameLabel);

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'glass-input';
    nameInput.placeholder = 'Entrez votre nom';
    nameInput.value = this.playerName;
    nameInput.maxLength = 20;
    nameInput.addEventListener('input', (e) => {
      this.playerName = (e.target as HTMLInputElement).value;
    });
    form.appendChild(nameInput);

    // Join button
    const joinBtn = document.createElement('button');
    joinBtn.className = 'glass-button primary';
    joinBtn.textContent = 'Rejoindre';
    joinBtn.addEventListener('click', () => {
      if (!this.roomCode.trim()) {
        Toast.warning('Veuillez entrer un code de salle');
        return;
      }
      if (!this.playerName.trim()) {
        Toast.warning('Veuillez entrer votre nom');
        return;
      }
      
      // Save player name
      try {
        localStorage.setItem('chess-player-name', this.playerName);
      } catch (e) {
        // Ignore
      }
      
      if (this.onJoinRoom) {
        // Don't uppercase - UUID codes are lowercase
        this.onJoinRoom(this.roomCode.trim(), this.playerName.trim());
      }
    });
    form.appendChild(joinBtn);

    this.lobbyElement.appendChild(form);
  }

  /**
   * Renders the waiting room view
   */
  private renderWaitingRoom(): void {
    if (!this.lobbyElement) return;

    // Header
    const header = this.createHeader('Salle de jeu');
    this.lobbyElement.appendChild(header);

    // Room code display
    if (this.roomCode) {
      const codeSection = document.createElement('div');
      codeSection.style.textAlign = 'center';

      const codeLabel = document.createElement('div');
      codeLabel.className = 'room-code-label';
      codeLabel.textContent = 'Code de la salle';
      codeSection.appendChild(codeLabel);

      const codeDisplay = document.createElement('div');
      codeDisplay.className = 'room-code-display glass-card';
      codeDisplay.textContent = this.roomCode;
      codeSection.appendChild(codeDisplay);

      const copyBtn = document.createElement('div');
      copyBtn.className = 'room-code-copy';
      copyBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
        Copier le code
      `;
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(this.roomCode).then(() => {
          Toast.success('Code copié !');
        }).catch(() => {
          Toast.error('Échec de la copie');
        });
      });
      codeSection.appendChild(copyBtn);

      this.lobbyElement.appendChild(codeSection);
    }

    // Player list
    const playerList = document.createElement('div');
    playerList.className = 'player-list';

    const playerListTitle = document.createElement('div');
    playerListTitle.className = 'player-list-title';
    playerListTitle.textContent = 'Joueurs';
    playerList.appendChild(playerListTitle);

    if (this.players.length === 0) {
      const waiting = document.createElement('div');
      waiting.className = 'lobby-waiting';
      waiting.innerHTML = `
        <div class="spinner"></div>
        <div class="lobby-waiting-text">En attente d'un adversaire...</div>
      `;
      playerList.appendChild(waiting);
    } else {
      for (const player of this.players) {
        const playerItem = document.createElement('div');
        playerItem.className = 'player-item glass-card';

        const status = document.createElement('div');
        status.className = `player-status ${player.isReady ? 'ready' : player.isConnected ? 'connected' : 'waiting'}`;
        playerItem.appendChild(status);

        const name = document.createElement('div');
        name.className = 'player-item-name';
        name.textContent = player.name;
        playerItem.appendChild(name);

        if (player.color) {
          const badge = document.createElement('div');
          badge.className = 'player-item-badge';
          badge.textContent = player.color === PieceColor.WHITE ? 'Blancs' : 'Noirs';
          playerItem.appendChild(badge);
        }

        playerList.appendChild(playerItem);
      }
    }

    this.lobbyElement.appendChild(playerList);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'lobby-actions';

    // Ready button (only show if both players are connected)
    if (this.players.length >= 2) {
      const readyBtn = document.createElement('button');
      readyBtn.className = 'glass-button primary';
      readyBtn.textContent = 'Prêt';
      readyBtn.addEventListener('click', () => {
        if (this.onReady) {
          this.onReady();
        }
      });
      actions.appendChild(readyBtn);
    }

    // Leave button
    const leaveBtn = document.createElement('button');
    leaveBtn.className = 'glass-button danger';
    leaveBtn.textContent = 'Quitter';
    leaveBtn.addEventListener('click', () => {
      if (this.onLeave) {
        this.onLeave();
      }
    });
    actions.appendChild(leaveBtn);

    this.lobbyElement.appendChild(actions);
  }

  /**
   * Creates a header element
   */
  private createHeader(title: string, onBack?: () => void): HTMLElement {
    const header = document.createElement('div');
    header.className = 'settings-header';

    if (onBack || this.onBack) {
      const backButton = document.createElement('button');
      backButton.className = 'settings-back';
      backButton.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
      `;
      backButton.addEventListener('click', () => {
        if (onBack) {
          onBack();
        } else if (this.onBack) {
          this.onBack();
        }
      });
      header.appendChild(backButton);
    }

    const titleElement = document.createElement('h2');
    titleElement.className = 'lobby-title';
    titleElement.textContent = title;
    header.appendChild(titleElement);

    return header;
  }

  /**
   * Shows the create room view
   */
  showCreateRoom(): void {
    this.mode = 'create';
    this.render();
  }

  /**
   * Shows the join room view
   */
  showJoinRoom(): void {
    this.mode = 'join';
    this.render();
  }

  /**
   * Updates the room information
   */
  updateRoom(room: Room): void {
    this.currentRoom = room;
    this.roomCode = room.id;
    this.mode = 'waiting';
    this.render();
  }

  /**
   * Updates the player list
   */
  updatePlayers(players: Player[]): void {
    this.players = players;
    if (this.mode === 'waiting') {
      this.render();
    }
  }

  /**
   * Sets the room code
   */
  setRoomCode(code: string): void {
    this.roomCode = code;
    this.mode = 'waiting';
    this.render();
  }

  /**
   * Shows the lobby
   */
  show(): void {
    if (!this.lobbyElement) {
      this.render();
    }
    if (this.lobbyElement) {
      this.lobbyElement.style.display = 'flex';
    }
  }

  /**
   * Hides the lobby
   */
  hide(): void {
    if (this.lobbyElement) {
      this.lobbyElement.style.display = 'none';
    }
  }

  /**
   * Resets the lobby to initial state
   */
  reset(): void {
    this.mode = 'select';
    this.roomCode = '';
    this.currentRoom = null;
    this.players = [];
    this.render();
  }

  /**
   * Destroys the lobby
   */
  destroy(): void {
    if (this.lobbyElement) {
      this.lobbyElement.remove();
      this.lobbyElement = null;
    }
  }
}