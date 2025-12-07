/**
 * GameChat Component - Private P2P Chat for Game Sessions
 * 
 * A private chat between two players during a peer-to-peer game.
 * Uses the existing PeerConnection for direct messaging.
 */

import { PeerConnection } from '../../network/peer-connection';
import { 
  GameMessage, 
  MessageType, 
  ChatMessage as NetworkChatMessage,
  createChatMessage 
} from '../../network/messages';

// ============================================
// Types
// ============================================

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
  isOwn: boolean;
}

// ============================================
// GameChat Class
// ============================================

export class GameChat {
  private container: HTMLElement | null = null;
  private chatElement: HTMLElement | null = null;
  private peerConnection: PeerConnection | null = null;
  private localPlayerName: string = '';
  private remotePlayerName: string = '';
  private messages: ChatMessage[] = [];
  private isOpen: boolean = false;
  private unreadCount: number = 0;
  private messageListElement: HTMLElement | null = null;
  private inputElement: HTMLInputElement | null = null;
  private originalMessageHandler: ((message: GameMessage) => void) | null = null;
  
  constructor(container?: HTMLElement) {
    this.container = container || null;
  }
  
  // ============================================
  // Public Methods
  // ============================================
  
  /**
   * Initialize the game chat with peer connection
   */
  initialize(
    peerConnection: PeerConnection, 
    localPlayerName: string, 
    remotePlayerName: string
  ): void {
    this.peerConnection = peerConnection;
    this.localPlayerName = localPlayerName;
    this.remotePlayerName = remotePlayerName;
    this.messages = [];
    this.unreadCount = 0;
    
    // Setup message handler
    this.setupMessageHandler();
    
    // Render the chat
    this.render();
  }
  
  /**
   * Render the game chat interface
   */
  render(): void {
    // Remove existing element if present
    if (this.chatElement) {
      this.chatElement.remove();
    }
    
    this.chatElement = document.createElement('div');
    this.chatElement.className = 'game-chat-overlay';
    this.chatElement.innerHTML = `
      <div class="game-chat-container ${this.isOpen ? '' : 'hidden'}">
        <div class="game-chat-header">
          <div class="game-chat-header-left">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="game-chat-icon">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span class="game-chat-title">Chat avec ${this.escapeHtml(this.remotePlayerName)}</span>
          </div>
          <button class="game-chat-close-btn" aria-label="Fermer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        
        <div class="game-chat-messages" role="log" aria-live="polite">
          ${this.renderMessages()}
        </div>
        
        <div class="game-chat-input-container">
          <input type="text" class="game-chat-input" placeholder="Message..." maxlength="200" />
          <button class="game-chat-send-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>
      
      <button class="game-chat-toggle-btn" aria-label="Ouvrir le chat">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        ${this.unreadCount > 0 ? `<span class="game-chat-badge">${this.unreadCount > 9 ? '9+' : this.unreadCount}</span>` : ''}
      </button>
    `;
    
    // Append to body or container
    if (this.container) {
      this.container.appendChild(this.chatElement);
    } else {
      document.body.appendChild(this.chatElement);
    }
    
    this.setupEventListeners();
    
    // Store references
    this.messageListElement = this.chatElement.querySelector('.game-chat-messages');
    this.inputElement = this.chatElement.querySelector('.game-chat-input');
    
    // Scroll to bottom
    this.scrollToBottom();
  }
  
  /**
   * Show the chat
   */
  show(): void {
    if (!this.chatElement) {
      this.render();
    }
    if (this.chatElement) {
      this.chatElement.style.display = 'flex';
    }
  }
  
  /**
   * Hide the chat
   */
  hide(): void {
    if (this.chatElement) {
      this.chatElement.style.display = 'none';
    }
    this.isOpen = false;
  }
  
  /**
   * Destroy the chat component
   */
  destroy(): void {
    // Restore original message handler
    if (this.peerConnection && this.originalMessageHandler) {
      this.peerConnection.onMessage = this.originalMessageHandler;
    }
    
    if (this.chatElement) {
      this.chatElement.remove();
      this.chatElement = null;
    }
    
    this.messages = [];
    this.peerConnection = null;
  }
  
  /**
   * Send a message
   */
  sendMessage(content: string): void {
    if (!this.peerConnection || !content.trim()) return;
    
    const message: ChatMessage = {
      id: this.generateMessageId(),
      senderId: this.peerConnection.getPeerId(),
      senderName: this.localPlayerName,
      content: content.trim(),
      timestamp: Date.now(),
      isOwn: true
    };
    
    // Add to local messages
    this.addMessage(message);
    
    // Send via peer connection
    const networkMessage = createChatMessage(
      this.peerConnection.getPeerId(),
      content.trim()
    );
    this.peerConnection.send(networkMessage);
    
    // Clear input
    if (this.inputElement) {
      this.inputElement.value = '';
    }
  }
  
  // ============================================
  // Private Methods
  // ============================================
  
  /**
   * Setup message handler for peer connection
   */
  private setupMessageHandler(): void {
    if (!this.peerConnection) return;
    
    // Store original handler
    this.originalMessageHandler = this.peerConnection.onMessage;
    
    // Create new handler that intercepts chat messages
    this.peerConnection.onMessage = (message: GameMessage) => {
      if (message.type === MessageType.CHAT) {
        this.handleIncomingMessage(message as NetworkChatMessage);
      }
      
      // Forward to original handler
      this.originalMessageHandler?.(message);
    };
  }
  
  /**
   * Handle incoming chat message
   */
  private handleIncomingMessage(networkMessage: NetworkChatMessage): void {
    const message: ChatMessage = {
      id: this.generateMessageId(),
      senderId: networkMessage.senderId,
      senderName: this.remotePlayerName,
      content: networkMessage.content,
      timestamp: networkMessage.timestamp,
      isOwn: false
    };
    
    this.addMessage(message);
  }
  
  /**
   * Add a message to the list
   */
  private addMessage(message: ChatMessage): void {
    this.messages.push(message);
    
    // Limit messages
    if (this.messages.length > 100) {
      this.messages = this.messages.slice(-100);
    }
    
    // Update UI
    this.renderMessageList();
    this.scrollToBottom();
    
    // Increment unread count if chat is closed and message is not from us
    if (!this.isOpen && !message.isOwn) {
      this.unreadCount++;
      this.updateBadge();
    }
  }
  
  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    if (!this.chatElement) return;
    
    // Toggle button
    const toggleBtn = this.chatElement.querySelector('.game-chat-toggle-btn');
    toggleBtn?.addEventListener('click', () => {
      this.toggleChat();
    });
    
    // Close button
    const closeBtn = this.chatElement.querySelector('.game-chat-close-btn');
    closeBtn?.addEventListener('click', () => {
      this.toggleChat();
    });
    
    // Send button
    const sendBtn = this.chatElement.querySelector('.game-chat-send-btn');
    const chatInput = this.chatElement.querySelector('.game-chat-input') as HTMLInputElement;
    
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
   * Toggle chat open/closed
   */
  private toggleChat(): void {
    this.isOpen = !this.isOpen;
    
    const container = this.chatElement?.querySelector('.game-chat-container');
    if (container) {
      container.classList.toggle('hidden', !this.isOpen);
    }
    
    // Clear unread count when opening
    if (this.isOpen) {
      this.unreadCount = 0;
      this.updateBadge();
      
      // Focus input
      setTimeout(() => this.inputElement?.focus(), 100);
    }
  }
  
  /**
   * Update the unread badge
   */
  private updateBadge(): void {
    const toggleBtn = this.chatElement?.querySelector('.game-chat-toggle-btn');
    if (!toggleBtn) return;
    
    const existingBadge = toggleBtn.querySelector('.game-chat-badge');
    if (existingBadge) {
      existingBadge.remove();
    }
    
    if (this.unreadCount > 0) {
      const badge = document.createElement('span');
      badge.className = 'game-chat-badge';
      badge.textContent = this.unreadCount > 9 ? '9+' : String(this.unreadCount);
      toggleBtn.appendChild(badge);
    }
  }
  
  /**
   * Render messages
   */
  private renderMessages(): string {
    if (this.messages.length === 0) {
      return '<div class="game-chat-empty">Aucun message</div>';
    }
    return this.messages.map(msg => this.renderMessage(msg)).join('');
  }
  
  /**
   * Render a single message
   */
  private renderMessage(message: ChatMessage): string {
    const time = new Date(message.timestamp).toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    return `
      <div class="game-chat-message ${message.isOwn ? 'own' : ''}">
        <div class="game-chat-message-header">
          <span class="game-chat-message-sender">${this.escapeHtml(message.senderName)}</span>
          <span class="game-chat-message-time">${time}</span>
        </div>
        <div class="game-chat-message-content">${this.escapeHtml(message.content)}</div>
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
   * Scroll to bottom of messages
   */
  private scrollToBottom(): void {
    if (this.messageListElement) {
      this.messageListElement.scrollTop = this.messageListElement.scrollHeight;
    }
  }
  
  /**
   * Generate a message ID
   */
  private generateMessageId(): string {
    return `gmsg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Escape HTML
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}