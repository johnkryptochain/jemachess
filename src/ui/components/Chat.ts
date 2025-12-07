/**
 * Chat Component - Global Decentralized Chat Room
 * 
 * A decentralized chat system using Gun.js for real-time P2P synchronization.
 * No server required - uses public Gun relay peers for discovery.
 */

import Gun from 'gun';
import 'gun/sea';

// ============================================
// Types
// ============================================

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
  type: 'message' | 'system' | 'join' | 'leave';
}

interface ChatUser {
  id: string;
  name: string;
  lastSeen: number;
}

interface ChatState {
  isConnected: boolean;
  isConnecting: boolean;
  localUserId: string;
  localName: string;
  users: Map<string, ChatUser>;
  messages: ChatMessage[];
}

// ============================================
// Constants
// ============================================

// Global chat room identifier
const CHAT_ROOM_ID = 'chess-game-global-chat-v1';
const MAX_MESSAGES = 200;
const USER_TIMEOUT = 60000; // 1 minute (reduced for faster detection)
const PRESENCE_INTERVAL = 15000; // 15 seconds (more frequent updates)
const INITIAL_PRESENCE_DELAY = 1000; // 1 second delay for initial presence

// LocalStorage keys for session persistence
const STORAGE_KEY_USER_ID = 'chess-chat-user-id';
const STORAGE_KEY_USER_NAME = 'chess-chat-user-name';
const STORAGE_KEY_SESSION = 'chess-chat-session';

// Public Gun relay peers for discovery (no account needed)
const GUN_PEERS = [
  'https://gun-manhattan.herokuapp.com/gun',
  'https://gun-us.herokuapp.com/gun',
  'https://gun-eu.herokuapp.com/gun'
];

// ============================================
// Chat Class
// ============================================

export class Chat {
  private container: HTMLElement | null = null;
  private chatElement: HTMLElement | null = null;
  private chatContainer: HTMLElement | null = null;
  private toggleBtn: HTMLElement | null = null;
  private gun: any = null;
  private chatRoom: any = null;
  private usersNode: any = null;
  private isOpen: boolean = false;
  private unreadCount: number = 0;
  private state: ChatState = {
    isConnected: false,
    isConnecting: false,
    localUserId: '',
    localName: '',
    users: new Map(),
    messages: []
  };
  
  private presenceInterval: ReturnType<typeof setInterval> | null = null;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private messageListElement: HTMLElement | null = null;
  private inputElement: HTMLInputElement | null = null;
  private seenMessageIds: Set<string> = new Set();
  
  // Callbacks
  public onClose: (() => void) | null = null;
  
  constructor(container?: HTMLElement) {
    this.container = container || null;
    this.loadMessages();
    this.loadSession();
  }
  
  // ============================================
  // Public Methods
  // ============================================
  
  /**
   * Render the chat interface as a bottom-right widget
   */
  render(): void {
    // Remove existing element if present
    if (this.chatElement) {
      this.chatElement.remove();
    }
    
    this.chatElement = document.createElement('div');
    this.chatElement.className = 'chat-overlay';
    this.chatElement.innerHTML = `
      <div class="chat-container ${this.isOpen ? '' : 'hidden'}">
        <div class="chat-header">
          <div class="chat-header-left">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="chat-icon">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <h2>Chat Global</h2>
            <span class="chat-status ${this.state.isConnected ? 'connected' : this.state.isConnecting ? 'connecting' : 'disconnected'}">
              ${this.state.isConnected ? `${this.state.users.size + 1} en ligne` : this.state.isConnecting ? 'Connexion...' : 'Déconnecté'}
            </span>
          </div>
          <button class="chat-close-btn" aria-label="Réduire">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>
        
        ${!this.state.isConnected && !this.state.isConnecting ? `
          <div class="chat-login">
            <div class="chat-login-content">
              <h3>Rejoindre le chat</h3>
              <p>Entrez un pseudo pour rejoindre le chat global</p>
              <input type="text" class="chat-name-input" placeholder="Votre pseudo..." maxlength="20" />
              <button class="chat-join-btn">
                <span>Rejoindre</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </button>
            </div>
          </div>
        ` : `
          <div class="chat-messages" role="log" aria-live="polite">
            ${this.renderMessages()}
          </div>
          
          <div class="chat-input-container">
            <input type="text" class="chat-input" placeholder="Écrivez un message..." maxlength="500" ${!this.state.isConnected ? 'disabled' : ''} />
            <button class="chat-send-btn" ${!this.state.isConnected ? 'disabled' : ''}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        `}
      </div>
      
      <button class="chat-toggle-btn" aria-label="Ouvrir le chat">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        ${this.unreadCount > 0 ? `<span class="chat-badge">${this.unreadCount > 9 ? '9+' : this.unreadCount}</span>` : ''}
      </button>
    `;
    
    // Append to body (always at bottom right)
    document.body.appendChild(this.chatElement);
    
    this.setupEventListeners();
    
    // Store references
    this.chatContainer = this.chatElement.querySelector('.chat-container');
    this.toggleBtn = this.chatElement.querySelector('.chat-toggle-btn');
    this.messageListElement = this.chatElement.querySelector('.chat-messages');
    this.inputElement = this.chatElement.querySelector('.chat-input');
    
    // Scroll to bottom
    this.scrollToBottom();
  }
  
  /**
   * Toggle chat open/closed
   */
  private toggleChat(): void {
    this.isOpen = !this.isOpen;
    
    if (this.chatContainer) {
      this.chatContainer.classList.toggle('hidden', !this.isOpen);
    }
    
    // Clear unread count when opening
    if (this.isOpen) {
      this.unreadCount = 0;
      this.updateBadge();
      
      // Focus input if connected
      if (this.state.isConnected && this.inputElement) {
        setTimeout(() => this.inputElement?.focus(), 100);
      }
    }
  }
  
  /**
   * Update the unread badge
   */
  private updateBadge(): void {
    if (!this.toggleBtn) return;
    
    const existingBadge = this.toggleBtn.querySelector('.chat-badge');
    if (existingBadge) {
      existingBadge.remove();
    }
    
    if (this.unreadCount > 0) {
      const badge = document.createElement('span');
      badge.className = 'chat-badge';
      badge.textContent = this.unreadCount > 9 ? '9+' : String(this.unreadCount);
      this.toggleBtn.appendChild(badge);
    }
  }
  
  /**
   * Connect to the chat network using Gun.js
   */
  async connect(playerName: string, existingUserId?: string): Promise<void> {
    if (this.state.isConnecting || this.state.isConnected) return;
    
    this.state.isConnecting = true;
    this.state.localName = playerName;
    this.render();
    
    try {
      // Use existing user ID if provided (for session restore), otherwise generate new one
      this.state.localUserId = existingUserId || this.generateUserId();
      
      // Initialize Gun with public relay peers
      this.gun = Gun({
        peers: GUN_PEERS,
        localStorage: false, // Use memory only to avoid conflicts
        radisk: false
      });
      
      // Get the chat room node
      this.chatRoom = this.gun.get(CHAT_ROOM_ID);
      this.usersNode = this.chatRoom.get('users');
      
      // Subscribe to messages
      this.subscribeToMessages();
      
      // Subscribe to user presence
      this.subscribeToUsers();
      
      // Mark as connected
      this.state.isConnected = true;
      this.state.isConnecting = false;
      
      // Announce presence immediately
      this.announcePresence();
      
      // Announce presence again after a short delay to ensure sync
      setTimeout(() => {
        this.announcePresence();
      }, INITIAL_PRESENCE_DELAY);
      
      // And once more after 3 seconds for reliability
      setTimeout(() => {
        this.announcePresence();
        this.requestPresenceRefresh();
      }, 3000);
      
      // Start presence heartbeat
      this.startPresenceHeartbeat();
      
      // Start cleanup of stale users
      this.startUserCleanup();
      
      // Save session for auto-reconnect on page refresh
      this.saveSession();
      
      // Add system message (only if not restoring session)
      if (!existingUserId) {
        this.addSystemMessage(`Vous avez rejoint le chat en tant que ${playerName}`);
        // Send join message to others
        this.sendJoinMessage();
      } else {
        this.addSystemMessage(`Reconnecté en tant que ${playerName}`);
      }
      
      this.render();
      
    } catch (error) {
      console.error('Failed to connect to chat:', error);
      this.state.isConnecting = false;
      this.state.isConnected = false;
      this.render();
    }
  }
  
  /**
   * Disconnect from the chat network
   */
  disconnect(): void {
    // Send leave message
    if (this.state.isConnected) {
      this.sendLeaveMessage();
      
      // Remove our presence
      if (this.usersNode) {
        this.usersNode.get(this.state.localUserId).put(null);
      }
    }
    
    // Stop intervals
    if (this.presenceInterval) {
      clearInterval(this.presenceInterval);
      this.presenceInterval = null;
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    // Clear state
    this.state.users.clear();
    this.state.isConnected = false;
    this.state.localUserId = '';
    
    // Clear saved session
    this.clearSession();
    
    // Note: Gun doesn't have a destroy method, it will be garbage collected
    this.gun = null;
    this.chatRoom = null;
    this.usersNode = null;
    
    this.render();
  }
  
  /**
   * Send a chat message
   */
  sendMessage(content: string): void {
    if (!this.state.isConnected || !content.trim()) return;
    
    const message: ChatMessage = {
      id: this.generateMessageId(),
      senderId: this.state.localUserId,
      senderName: this.state.localName,
      content: content.trim(),
      timestamp: Date.now(),
      type: 'message'
    };
    
    // Add to local messages immediately
    this.addMessage(message);
    
    // Send to Gun network
    this.chatRoom.get('messages').get(message.id).put(JSON.stringify(message));
    
    // Clear input
    if (this.inputElement) {
      this.inputElement.value = '';
    }
  }
  
  /**
   * Show the chat widget
   */
  show(): void {
    if (!this.chatElement) {
      this.render();
    }
    if (this.chatElement) {
      this.chatElement.style.display = 'flex';
    }
    // Open the chat panel
    this.isOpen = true;
    if (this.chatContainer) {
      this.chatContainer.classList.remove('hidden');
    }
    this.unreadCount = 0;
    this.updateBadge();
  }
  
  /**
   * Hide the chat widget completely
   */
  hide(): void {
    if (this.chatElement) {
      this.chatElement.style.display = 'none';
    }
    this.isOpen = false;
  }
  
  /**
   * Minimize the chat (keep widget visible but close panel)
   */
  minimize(): void {
    this.isOpen = false;
    if (this.chatContainer) {
      this.chatContainer.classList.add('hidden');
    }
  }
  
  /**
   * Destroy the chat component
   */
  destroy(): void {
    this.disconnect();
    this.hide();
  }
  
  // ============================================
  // Private Methods - Gun.js Integration
  // ============================================
  
  /**
   * Subscribe to messages from Gun
   */
  private subscribeToMessages(): void {
    if (!this.chatRoom) return;
    
    this.chatRoom.get('messages').map().on((data: string | null, key: string) => {
      if (!data || this.seenMessageIds.has(key)) return;
      
      try {
        const message: ChatMessage = JSON.parse(data);
        
        // Skip our own messages (already added locally)
        if (message.senderId === this.state.localUserId && message.type === 'message') {
          this.seenMessageIds.add(key);
          return;
        }
        
        // Skip old messages (more than 1 hour old)
        if (Date.now() - message.timestamp > 3600000) {
          return;
        }
        
        this.seenMessageIds.add(key);
        this.handleIncomingMessage(message);
      } catch (error) {
        // Invalid message data, ignore
      }
    });
  }
  
  /**
   * Subscribe to user presence
   */
  private subscribeToUsers(): void {
    if (!this.usersNode) return;
    
    this.usersNode.map().on((data: string | null, oderId: string) => {
      if (!data) {
        // User left
        this.state.users.delete(oderId);
        this.updateStatus();
        return;
      }
      
      try {
        const user: ChatUser = JSON.parse(data);
        
        // Skip ourselves
        if (user.id === this.state.localUserId) return;
        
        // Check if user is still active (within timeout)
        if (Date.now() - user.lastSeen > USER_TIMEOUT) {
          this.state.users.delete(user.id);
        } else {
          this.state.users.set(user.id, user);
        }
        
        this.updateStatus();
      } catch (error) {
        // Invalid user data, ignore
      }
    });
  }
  
  /**
   * Announce our presence
   */
  private announcePresence(): void {
    if (!this.usersNode || !this.state.isConnected) return;
    
    const userData: ChatUser = {
      id: this.state.localUserId,
      name: this.state.localName,
      lastSeen: Date.now()
    };
    
    this.usersNode.get(this.state.localUserId).put(JSON.stringify(userData));
  }
  
  /**
   * Request a presence refresh from all users by re-subscribing
   */
  private requestPresenceRefresh(): void {
    if (!this.usersNode) return;
    
    // Force a re-read of all users by iterating through the node
    this.usersNode.map().once((data: string | null, oderId: string) => {
      if (!data || oderId === this.state.localUserId) return;
      
      try {
        const user: ChatUser = JSON.parse(data);
        
        // Check if user is still active
        if (Date.now() - user.lastSeen <= USER_TIMEOUT) {
          this.state.users.set(user.id, user);
          this.updateStatus();
        }
      } catch (error) {
        // Invalid user data, ignore
      }
    });
  }
  
  /**
   * Start presence heartbeat
   */
  private startPresenceHeartbeat(): void {
    this.presenceInterval = setInterval(() => {
      this.announcePresence();
      // Also refresh our view of other users periodically
      this.requestPresenceRefresh();
    }, PRESENCE_INTERVAL);
  }
  
  /**
   * Start cleanup of stale users
   */
  private startUserCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      let changed = false;
      
      this.state.users.forEach((user, oderId) => {
        if (now - user.lastSeen > USER_TIMEOUT) {
          this.state.users.delete(oderId);
          changed = true;
        }
      });
      
      if (changed) {
        this.updateStatus();
      }
    }, 15000); // Check every 15 seconds instead of 30
  }
  
  /**
   * Handle incoming message from Gun
   */
  private handleIncomingMessage(message: ChatMessage): void {
    // Check if we already have this message
    if (this.state.messages.some(m => m.id === message.id)) {
      return;
    }
    
    // Add message
    this.addMessage(message);
  }
  
  /**
   * Send join message
   */
  private sendJoinMessage(): void {
    const message: ChatMessage = {
      id: this.generateMessageId(),
      senderId: this.state.localUserId,
      senderName: this.state.localName,
      content: `${this.state.localName} a rejoint le chat`,
      timestamp: Date.now(),
      type: 'join'
    };
    
    this.chatRoom.get('messages').get(message.id).put(JSON.stringify(message));
  }
  
  /**
   * Send leave message
   */
  private sendLeaveMessage(): void {
    const message: ChatMessage = {
      id: this.generateMessageId(),
      senderId: this.state.localUserId,
      senderName: this.state.localName,
      content: `${this.state.localName} a quitté le chat`,
      timestamp: Date.now(),
      type: 'leave'
    };
    
    this.chatRoom.get('messages').get(message.id).put(JSON.stringify(message));
  }
  
  // ============================================
  // Private Methods - Messaging
  // ============================================
  
  /**
   * Add a message to the list
   */
  private addMessage(message: ChatMessage): void {
    // Check for duplicates
    if (this.state.messages.some(m => m.id === message.id)) {
      return;
    }
    
    this.state.messages.push(message);
    
    // Sort by timestamp
    this.state.messages.sort((a, b) => a.timestamp - b.timestamp);
    
    // Limit messages
    if (this.state.messages.length > MAX_MESSAGES) {
      this.state.messages = this.state.messages.slice(-MAX_MESSAGES);
    }
    
    // Save messages
    this.saveMessages();
    
    // Update UI
    this.renderMessageList();
    this.scrollToBottom();
    
    // Increment unread count if chat is closed and message is not from us
    if (!this.isOpen && message.senderId !== this.state.localUserId && message.type === 'message') {
      this.unreadCount++;
      this.updateBadge();
    }
  }
  
  /**
   * Add a system message
   */
  private addSystemMessage(content: string): void {
    this.addMessage({
      id: this.generateMessageId(),
      senderId: 'system',
      senderName: 'Système',
      content,
      timestamp: Date.now(),
      type: 'system'
    });
  }
  
  // ============================================
  // Private Methods - UI
  // ============================================
  
  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    if (!this.chatElement) return;
    
    // Toggle button
    const toggleBtn = this.chatElement.querySelector('.chat-toggle-btn');
    toggleBtn?.addEventListener('click', () => {
      this.toggleChat();
    });
    
    // Close/minimize button
    const closeBtn = this.chatElement.querySelector('.chat-close-btn');
    closeBtn?.addEventListener('click', () => {
      this.minimize();
    });
    
    // Join button
    const joinBtn = this.chatElement.querySelector('.chat-join-btn');
    const nameInput = this.chatElement.querySelector('.chat-name-input') as HTMLInputElement;
    
    joinBtn?.addEventListener('click', () => {
      const name = nameInput?.value.trim();
      if (name) {
        this.connect(name);
      }
    });
    
    nameInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const name = nameInput.value.trim();
        if (name) {
          this.connect(name);
        }
      }
    });
    
    // Send button
    const sendBtn = this.chatElement.querySelector('.chat-send-btn');
    const chatInput = this.chatElement.querySelector('.chat-input') as HTMLInputElement;
    
    sendBtn?.addEventListener('click', () => {
      const content = chatInput?.value;
      if (content) {
        this.sendMessage(content);
      }
    });
    
    chatInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const content = chatInput.value;
        if (content) {
          this.sendMessage(content);
        }
      }
    });
  }
  
  /**
   * Render messages
   */
  private renderMessages(): string {
    return this.state.messages.map(msg => this.renderMessage(msg)).join('');
  }
  
  /**
   * Render a single message
   */
  private renderMessage(message: ChatMessage): string {
    const isOwn = message.senderId === this.state.localUserId;
    const time = new Date(message.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    
    if (message.type === 'system' || message.type === 'join' || message.type === 'leave') {
      return `
        <div class="chat-message system">
          <span class="chat-message-content">${this.escapeHtml(message.content)}</span>
          <span class="chat-message-time">${time}</span>
        </div>
      `;
    }
    
    return `
      <div class="chat-message ${isOwn ? 'own' : ''}">
        <div class="chat-message-header">
          <span class="chat-message-sender">${this.escapeHtml(message.senderName)}</span>
          <span class="chat-message-time">${time}</span>
        </div>
        <div class="chat-message-content">${this.escapeHtml(message.content)}</div>
      </div>
    `;
  }
  
  /**
   * Render message list
   */
  private renderMessageList(): void {
    if (this.messageListElement) {
      this.messageListElement.innerHTML = this.renderMessages();
    }
  }
  
  /**
   * Update status display
   */
  private updateStatus(): void {
    const statusEl = this.chatElement?.querySelector('.chat-status');
    if (statusEl) {
      statusEl.className = `chat-status ${this.state.isConnected ? 'connected' : 'disconnected'}`;
      statusEl.textContent = this.state.isConnected ? `${this.state.users.size + 1} en ligne` : 'Déconnecté';
    }
  }
  
  /**
   * Scroll to bottom of messages
   */
  private scrollToBottom(): void {
    if (this.messageListElement) {
      this.messageListElement.scrollTop = this.messageListElement.scrollHeight;
    }
  }
  
  // ============================================
  // Private Methods - Utilities
  // ============================================
  
  /**
   * Generate a user ID
   */
  private generateUserId(): string {
    return `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Generate a message ID
   */
  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Escape HTML
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  /**
   * Save messages to localStorage
   */
  private saveMessages(): void {
    try {
      const recentMessages = this.state.messages.slice(-50);
      localStorage.setItem('chess-chat-messages', JSON.stringify(recentMessages));
    } catch (error) {
      console.error('Failed to save messages:', error);
    }
  }
  
  /**
   * Load messages from localStorage
   */
  private loadMessages(): void {
    try {
      const saved = localStorage.getItem('chess-chat-messages');
      if (saved) {
        const messages = JSON.parse(saved);
        // Only load recent messages (less than 1 hour old)
        const oneHourAgo = Date.now() - 3600000;
        this.state.messages = messages.filter((m: ChatMessage) => m.timestamp > oneHourAgo);
        // Add message IDs to seen set
        this.state.messages.forEach((m: ChatMessage) => this.seenMessageIds.add(m.id));
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }
  
  /**
   * Save session to localStorage for auto-reconnect
   */
  private saveSession(): void {
    try {
      localStorage.setItem(STORAGE_KEY_USER_ID, this.state.localUserId);
      localStorage.setItem(STORAGE_KEY_USER_NAME, this.state.localName);
      localStorage.setItem(STORAGE_KEY_SESSION, Date.now().toString());
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }
  
  /**
   * Load session from localStorage and auto-reconnect
   */
  private loadSession(): void {
    try {
      const savedUserId = localStorage.getItem(STORAGE_KEY_USER_ID);
      const savedUserName = localStorage.getItem(STORAGE_KEY_USER_NAME);
      const savedSessionTime = localStorage.getItem(STORAGE_KEY_SESSION);
      
      if (savedUserId && savedUserName && savedSessionTime) {
        // Check if session is still valid (less than 24 hours old)
        const sessionAge = Date.now() - parseInt(savedSessionTime, 10);
        const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours
        
        if (sessionAge < maxSessionAge) {
          // Auto-reconnect with saved credentials after a short delay
          setTimeout(() => {
            this.connect(savedUserName, savedUserId);
          }, 500);
        } else {
          // Session expired, clear it
          this.clearSession();
        }
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  }
  
  /**
   * Clear saved session
   */
  private clearSession(): void {
    try {
      localStorage.removeItem(STORAGE_KEY_USER_ID);
      localStorage.removeItem(STORAGE_KEY_USER_NAME);
      localStorage.removeItem(STORAGE_KEY_SESSION);
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  }
}