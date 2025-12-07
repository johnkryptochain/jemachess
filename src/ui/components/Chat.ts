/**
 * Chat Component - Global P2P Chat Room
 * 
 * A peer-to-peer chat system using PeerJS for WebRTC connections.
 * Uses a mesh network approach where each peer connects to all others.
 */

import Peer, { DataConnection } from 'peerjs';

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

interface ChatPeer {
  id: string;
  name: string;
  connection: DataConnection | null;
  lastSeen: number;
}

interface ChatState {
  isConnected: boolean;
  isConnecting: boolean;
  localPeerId: string;
  localName: string;
  peers: Map<string, ChatPeer>;
  messages: ChatMessage[];
}

// ============================================
// Constants
// ============================================

// Public room ID prefix - all peers will try to connect to peers with this prefix
const ROOM_PREFIX = 'chess-chat-global-';
const MAX_PEERS = 50;
const PEER_DISCOVERY_INTERVAL = 10000; // 10 seconds
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const PEER_TIMEOUT = 60000; // 1 minute
const MAX_MESSAGES = 200;

// List of known peer IDs to try connecting to (bootstrap nodes)
const BOOTSTRAP_PEER_COUNT = 10;

// ============================================
// Chat Class
// ============================================

export class Chat {
  private container: HTMLElement | null = null;
  private chatElement: HTMLElement | null = null;
  private chatContainer: HTMLElement | null = null;
  private toggleBtn: HTMLElement | null = null;
  private peer: Peer | null = null;
  private isOpen: boolean = false;
  private unreadCount: number = 0;
  private state: ChatState = {
    isConnected: false,
    isConnecting: false,
    localPeerId: '',
    localName: '',
    peers: new Map(),
    messages: []
  };
  
  private discoveryInterval: ReturnType<typeof setInterval> | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private messageListElement: HTMLElement | null = null;
  private inputElement: HTMLInputElement | null = null;
  
  // Callbacks
  public onClose: (() => void) | null = null;
  
  constructor(container?: HTMLElement) {
    this.container = container || null;
    this.loadMessages();
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
              ${this.state.isConnected ? `${this.state.peers.size + 1} en ligne` : this.state.isConnecting ? 'Connexion...' : 'Déconnecté'}
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
   * Connect to the chat network
   */
  async connect(playerName: string): Promise<void> {
    if (this.state.isConnecting || this.state.isConnected) return;
    
    this.state.isConnecting = true;
    this.state.localName = playerName;
    this.render();
    
    try {
      // Generate a unique peer ID
      const peerId = this.generatePeerId();
      
      // Create peer connection
      this.peer = new Peer(peerId, {
        debug: 1
      });
      
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 30000);
        
        this.peer!.on('open', (id) => {
          clearTimeout(timeout);
          this.state.localPeerId = id;
          this.state.isConnected = true;
          this.state.isConnecting = false;
          
          // Setup peer listeners
          this.setupPeerListeners();
          
          // Start discovery and heartbeat
          this.startDiscovery();
          this.startHeartbeat();
          
          // Add system message
          this.addSystemMessage(`Vous avez rejoint le chat en tant que ${playerName}`);
          
          this.render();
          resolve();
        });
        
        this.peer!.on('error', (err) => {
          clearTimeout(timeout);
          console.error('Peer error:', err);
          reject(err);
        });
      });
      
    } catch (error) {
      console.error('Failed to connect:', error);
      this.state.isConnecting = false;
      this.state.isConnected = false;
      this.render();
    }
  }
  
  /**
   * Disconnect from the chat network
   */
  disconnect(): void {
    // Notify peers
    this.broadcastMessage({
      id: this.generateMessageId(),
      senderId: this.state.localPeerId,
      senderName: this.state.localName,
      content: '',
      timestamp: Date.now(),
      type: 'leave'
    });
    
    // Stop intervals
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = null;
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    // Close all connections
    this.state.peers.forEach(peer => {
      peer.connection?.close();
    });
    this.state.peers.clear();
    
    // Destroy peer
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    
    this.state.isConnected = false;
    this.state.localPeerId = '';
    this.render();
  }
  
  /**
   * Send a chat message
   */
  sendMessage(content: string): void {
    if (!this.state.isConnected || !content.trim()) return;
    
    const message: ChatMessage = {
      id: this.generateMessageId(),
      senderId: this.state.localPeerId,
      senderName: this.state.localName,
      content: content.trim(),
      timestamp: Date.now(),
      type: 'message'
    };
    
    // Add to local messages
    this.addMessage(message);
    
    // Broadcast to all peers
    this.broadcastMessage(message);
    
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
  // Private Methods - Peer Management
  // ============================================
  
  /**
   * Setup peer event listeners
   */
  private setupPeerListeners(): void {
    if (!this.peer) return;
    
    // Handle incoming connections
    this.peer.on('connection', (conn) => {
      this.handleIncomingConnection(conn);
    });
    
    // Handle disconnection
    this.peer.on('disconnected', () => {
      console.log('Disconnected from signaling server, attempting reconnect...');
      this.peer?.reconnect();
    });
    
    // Handle errors
    this.peer.on('error', (err: Error & { type?: string }) => {
      console.error('Peer error:', err);
      if (err.type === 'peer-unavailable') {
        // Peer not found, this is normal during discovery
      }
    });
  }
  
  /**
   * Handle incoming connection from another peer
   */
  private handleIncomingConnection(conn: DataConnection): void {
    conn.on('open', () => {
      // Send our info
      conn.send(JSON.stringify({
        type: 'hello',
        peerId: this.state.localPeerId,
        name: this.state.localName,
        knownPeers: Array.from(this.state.peers.keys())
      }));
    });
    
    conn.on('data', (data) => {
      this.handlePeerData(conn, data);
    });
    
    conn.on('close', () => {
      this.handlePeerDisconnect(conn.peer);
    });
    
    conn.on('error', (err) => {
      console.error('Connection error:', err);
    });
  }
  
  /**
   * Connect to a peer
   */
  private connectToPeer(peerId: string): void {
    if (!this.peer || peerId === this.state.localPeerId || this.state.peers.has(peerId)) {
      return;
    }
    
    if (this.state.peers.size >= MAX_PEERS) {
      return;
    }
    
    try {
      const conn = this.peer.connect(peerId, { reliable: true });
      
      conn.on('open', () => {
        // Send our info
        conn.send(JSON.stringify({
          type: 'hello',
          peerId: this.state.localPeerId,
          name: this.state.localName,
          knownPeers: Array.from(this.state.peers.keys())
        }));
      });
      
      conn.on('data', (data) => {
        this.handlePeerData(conn, data);
      });
      
      conn.on('close', () => {
        this.handlePeerDisconnect(peerId);
      });
      
      conn.on('error', (err) => {
        // Peer not available, remove from list
        this.state.peers.delete(peerId);
      });
      
    } catch (error) {
      console.error('Failed to connect to peer:', error);
    }
  }
  
  /**
   * Handle data from a peer
   */
  private handlePeerData(conn: DataConnection, data: unknown): void {
    if (typeof data !== 'string') return;
    
    try {
      const parsed = JSON.parse(data);
      
      switch (parsed.type) {
        case 'hello':
          this.handleHello(conn, parsed);
          break;
        case 'message':
        case 'join':
        case 'leave':
        case 'system':
          this.handleChatMessage(parsed);
          break;
        case 'heartbeat':
          this.handleHeartbeat(conn.peer);
          break;
        case 'peers':
          this.handlePeerList(parsed.peers);
          break;
      }
    } catch (error) {
      console.error('Failed to parse peer data:', error);
    }
  }
  
  /**
   * Handle hello message from peer
   */
  private handleHello(conn: DataConnection, data: { peerId: string; name: string; knownPeers: string[] }): void {
    const { peerId, name, knownPeers } = data;
    
    // Add peer to our list
    if (!this.state.peers.has(peerId)) {
      this.state.peers.set(peerId, {
        id: peerId,
        name: name,
        connection: conn,
        lastSeen: Date.now()
      });
      
      // Add join message
      this.addSystemMessage(`${name} a rejoint le chat`);
      
      // Update UI
      this.updateStatus();
    } else {
      // Update existing peer
      const peer = this.state.peers.get(peerId)!;
      peer.connection = conn;
      peer.lastSeen = Date.now();
    }
    
    // Try to connect to their known peers
    knownPeers.forEach(pid => {
      if (pid !== this.state.localPeerId && !this.state.peers.has(pid)) {
        this.connectToPeer(pid);
      }
    });
  }
  
  /**
   * Handle chat message
   */
  private handleChatMessage(message: ChatMessage): void {
    // Check if we already have this message
    if (this.state.messages.some(m => m.id === message.id)) {
      return;
    }
    
    // Add message
    this.addMessage(message);
    
    // Forward to other peers (mesh network)
    this.broadcastMessage(message, message.senderId);
  }
  
  /**
   * Handle heartbeat from peer
   */
  private handleHeartbeat(peerId: string): void {
    const peer = this.state.peers.get(peerId);
    if (peer) {
      peer.lastSeen = Date.now();
    }
  }
  
  /**
   * Handle peer list from another peer
   */
  private handlePeerList(peers: string[]): void {
    peers.forEach(peerId => {
      if (peerId !== this.state.localPeerId && !this.state.peers.has(peerId)) {
        this.connectToPeer(peerId);
      }
    });
  }
  
  /**
   * Handle peer disconnect
   */
  private handlePeerDisconnect(peerId: string): void {
    const peer = this.state.peers.get(peerId);
    if (peer) {
      this.addSystemMessage(`${peer.name} a quitté le chat`);
      this.state.peers.delete(peerId);
      this.updateStatus();
    }
  }
  
  // ============================================
  // Private Methods - Discovery & Heartbeat
  // ============================================
  
  /**
   * Start peer discovery
   */
  private startDiscovery(): void {
    // Try to connect to bootstrap peers
    this.discoverPeers();
    
    // Periodically discover new peers
    this.discoveryInterval = setInterval(() => {
      this.discoverPeers();
    }, PEER_DISCOVERY_INTERVAL);
  }
  
  /**
   * Discover peers by trying known peer IDs
   */
  private discoverPeers(): void {
    // Generate potential peer IDs to try
    for (let i = 0; i < BOOTSTRAP_PEER_COUNT; i++) {
      const potentialPeerId = `${ROOM_PREFIX}${i}`;
      if (potentialPeerId !== this.state.localPeerId) {
        this.connectToPeer(potentialPeerId);
      }
    }
    
    // Also try to connect to peers known by our peers
    this.state.peers.forEach(peer => {
      if (peer.connection?.open) {
        peer.connection.send(JSON.stringify({
          type: 'peers',
          peers: Array.from(this.state.peers.keys())
        }));
      }
    });
  }
  
  /**
   * Start heartbeat
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      // Send heartbeat to all peers
      this.state.peers.forEach(peer => {
        if (peer.connection?.open) {
          peer.connection.send(JSON.stringify({ type: 'heartbeat' }));
        }
      });
      
      // Remove stale peers
      const now = Date.now();
      this.state.peers.forEach((peer, peerId) => {
        if (now - peer.lastSeen > PEER_TIMEOUT) {
          this.handlePeerDisconnect(peerId);
        }
      });
    }, HEARTBEAT_INTERVAL);
  }
  
  // ============================================
  // Private Methods - Messaging
  // ============================================
  
  /**
   * Broadcast a message to all peers
   */
  private broadcastMessage(message: ChatMessage, excludePeerId?: string): void {
    const data = JSON.stringify(message);
    
    this.state.peers.forEach(peer => {
      if (peer.id !== excludePeerId && peer.connection?.open) {
        peer.connection.send(data);
      }
    });
  }
  
  /**
   * Add a message to the list
   */
  private addMessage(message: ChatMessage): void {
    this.state.messages.push(message);
    
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
    if (!this.isOpen && message.senderId !== this.state.localPeerId && message.type === 'message') {
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
    const isOwn = message.senderId === this.state.localPeerId;
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
      statusEl.textContent = this.state.isConnected ? `${this.state.peers.size + 1} en ligne` : 'Déconnecté';
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
   * Generate a peer ID
   */
  private generatePeerId(): string {
    // Try to get a bootstrap peer ID first
    const bootstrapIndex = Math.floor(Math.random() * BOOTSTRAP_PEER_COUNT);
    return `${ROOM_PREFIX}${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Generate a message ID
   */
  private generateMessageId(): string {
    return `${this.state.localPeerId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
        this.state.messages = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }
}