/* eslint-disable @typescript-eslint/no-explicit-any*/
import { CommonModule } from '@angular/common';
import { Component, ElementRef, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AlertService } from '@shared/components/alert/alert.service';
import { LucideAngularModule } from 'lucide-angular';
import { Subject, takeUntil } from 'rxjs';
import { AtheniaService, ConversationMessage, AtheniaQueryRequest, AtheniaResponse } from 'src/app/services/api/athenia.service';

@Component({
  selector: 'app-athenia-chat',
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './athenia-chat.html',
  styleUrl: './athenia-chat.css'
})
export class AtheniaChat implements OnInit, OnDestroy {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('questionInput') questionInput!: ElementRef;

  private atheniaService = inject(AtheniaService);
  private alertService = inject(AlertService);
  private destroy$ = new Subject<void>();

  messages: ConversationMessage[] = [];
  question = '';
  isLoading = false;
  isVisible = false;
  currentConversationId?: number;

  // Estadísticas
  atheniaStatus: any = {
    is_ready: true,  
    documents_indexed: 0,
    cache_size: 0
  };

  ngOnInit(): void {
    this.loadStatus();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Abrir/cerrar modal
  **/
  toggle(): void {
    this.isVisible = !this.isVisible;
    if (this.isVisible) {
      setTimeout(() => this.questionInput?.nativeElement.focus(), 100);
    }
  }

  /**
   * Cargar estado de ATHENIA
  **/
  loadStatus(): void {
    this.atheniaService.getStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (status) => {
          this.atheniaStatus = status;
        },
        error: () => {
          // El usuario verá un mensaje si no hay documentos
          this.atheniaStatus = {
            is_ready: true,
            documents_indexed: 0,
            cache_size: 0
          };
        }
      });
  }

  /**
   * Enviar pregunta
  **/
  sendQuestion(): void {
    if (!this.question.trim()) return;
    // Permitir enviar aunque no haya status
    const userMessage: ConversationMessage = {
      id: Date.now(),
      role: 'user',
      content: this.question,
      timestamp: new Date().toISOString()
    };
    this.messages.push(userMessage);

    const questionText = this.question;
    this.question = '';
    this.isLoading = true;

    // Preparar request
    const request: AtheniaQueryRequest = {
      question: questionText,
      use_cache: true
    };

    // Llamar a ATHENIA
    this.atheniaService.askQuestion(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: AtheniaResponse) => {
          const assistantMessage: ConversationMessage = {
            id: response.conversation_id,
            role: 'assistant',
            content: response.answer,
            timestamp: new Date().toISOString(),
            sources: response.sources,
            confidence: response.confidence,
            from_cache: response.from_cache
          };

          this.messages.push(assistantMessage);
          this.currentConversationId = response.conversation_id;
          this.isLoading = false;

          setTimeout(() => this.scrollToBottom(), 100);
        },
        error: () => {
          // Mostrar mensaje de error en el chat
          const errorMessage: ConversationMessage = {
            id: Date.now(),
            role: 'assistant',
            content: 'Lo siento, hubo un error al procesar tu pregunta. Por favor verifica que tengas documentos subidos e intenta de nuevo.',
            timestamp: new Date().toISOString()
          };
          this.messages.push(errorMessage);

          this.isLoading = false;
          setTimeout(() => this.scrollToBottom(), 100);
        }
      });
  }

  /**
   * Cargar historial de conversación
  **/
  loadHistory(): void {
    this.atheniaService.getHistory(this.currentConversationId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (messages) => {
          this.messages = messages;
          setTimeout(() => this.scrollToBottom(), 100);
        },
      });
  }

  /**
   * Limpiar conversación
  **/
  clearConversation(): void {
    this.messages = [];
    this.currentConversationId = undefined;
  }

  /**
   * Scroll al final del chat
  **/
  private scrollToBottom(): void {
    if (this.messagesContainer) {
      const element = this.messagesContainer.nativeElement;
      element.scrollTop = element.scrollHeight;
    }
  }

  /**
   * Manejar Enter para enviar
  **/
  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendQuestion();
    }
  }
}