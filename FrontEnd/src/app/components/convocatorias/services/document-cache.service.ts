/* eslint-disable @typescript-eslint/no-explicit-any */
// src/app/features/convocatorias/services/document-cache.service.ts

import { Injectable } from '@angular/core';
import { ConvocatoriaDocument } from 'src/app/domain/models/convocatorias.model';
import { BehaviorSubject } from 'rxjs';

type DocumentCache = Record<string, Record<string, ConvocatoriaDocument>>;

/**
 * Servicio de caché en memoria para documentos de convocatorias.
 * Mejora rendimiento al evitar recargas innecesarias del backend.
 */
@Injectable({
  providedIn: 'root'
})
export class DocumentCacheService {
  // ==================================================================
  // ESTADO INTERNO
  // ==================================================================

  private documentCache: DocumentCache = {};
  private cacheSubject = new BehaviorSubject<DocumentCache>({});
  public readonly cache$ = this.cacheSubject.asObservable();

  // ==================================================================
  // CACHÉ BÁSICO
  // ==================================================================

  /**
   * Almacena un documento en caché.
   * @param convocatoriaId ID de la convocatoria
   * @param document Documento a cachear
   */
  cacheDocument(convocatoriaId: string, document: ConvocatoriaDocument): void {
    if (!convocatoriaId || !document.id) return;

    if (!this.documentCache[convocatoriaId]) {
      this.documentCache[convocatoriaId] = {};
    }

    this.documentCache[convocatoriaId][document.id] = { ...document };
    this.emitCacheUpdate();
  }

  /**
   * Obtiene un documento del caché.
   * @param convocatoriaId ID de la convocatoria
   * @param documentId ID del documento
   * @returns Documento o `null` si no existe
   */
  getCachedDocument(convocatoriaId: string, documentId: string): ConvocatoriaDocument | null {
    return this.documentCache[convocatoriaId]?.[documentId] ?? null;
  }

  /**
   * Obtiene todos los documentos cacheados de una convocatoria.
   * @param convocatoriaId ID de la convocatoria
   * @returns Array de documentos
   */
  getCachedDocuments(convocatoriaId: string): ConvocatoriaDocument[] {
    return Object.values(this.documentCache[convocatoriaId] || {});
  }

  // ==================================================================
  // ACTUALIZACIÓN Y ELIMINACIÓN
  // ==================================================================

  /**
   * Elimina un documento específico del caché.
   * @param convocatoriaId ID de la convocatoria
   * @param documentId ID del documento
   */
  removeCachedDocument(convocatoriaId: string, documentId: string): void {
    if (!this.documentCache[convocatoriaId]?.[documentId]) return;

    delete this.documentCache[convocatoriaId][documentId];
    this.emitCacheUpdate();
  }

  /**
   * Actualiza propiedades de un documento cacheado.
   * @param convocatoriaId ID de la convocatoria
   * @param documentId ID del documento
   * @param updates Propiedades a actualizar
   * @returns Documento actualizado o `null` si no existe
   */
  updateDocumentData(
    convocatoriaId: string,
    documentId: string,
    updates: Partial<ConvocatoriaDocument>
  ): ConvocatoriaDocument | null {
    const cached = this.documentCache[convocatoriaId]?.[documentId];
    if (!cached) return null;

    const updated: ConvocatoriaDocument = {
      ...cached,
      ...updates,
      guide: updates.guide
        ? { ...cached.guide, ...updates.guide }
        : cached.guide
    };

    this.documentCache[convocatoriaId][documentId] = updated;
    this.emitCacheUpdate();

    return updated;
  }

  // ==================================================================
  // LIMPIEZA DE CACHÉ
  // ==================================================================

  /**
   * Invalida el caché de una convocatoria específica.
   * @param convocatoriaId ID de la convocatoria
   */
  invalidateCache(convocatoriaId: string): void {
    if (this.documentCache[convocatoriaId]) {
      delete this.documentCache[convocatoriaId];
      this.emitCacheUpdate();
    }
  }

  /**
   * Limpia todo el caché de documentos.
   */
  clearAllCache(): void {
    this.documentCache = {};
    this.cacheSubject.next({});
  }

  // ==================================================================
  // FUSIÓN CON DATOS DEL SERVIDOR
  // ==================================================================

  /**
   * Fusiona documentos del servidor con los cacheados.
   * Prioriza datos del servidor, pero conserva `fileName` y `guide` del caché.
   * @param convocatoriaId ID de la convocatoria
   * @param newDocuments Documentos recibidos del backend
   * @returns Documentos fusionados
   */
  mergeDocuments(
    convocatoriaId: string,
    newDocuments: ConvocatoriaDocument[]
  ): ConvocatoriaDocument[] {
    if (!this.documentCache[convocatoriaId]) {
      this.documentCache[convocatoriaId] = {};
    }

    const merged: ConvocatoriaDocument[] = [];

    newDocuments.forEach(doc => {
      const cached = this.documentCache[convocatoriaId][doc.id];

      const mergedDoc: ConvocatoriaDocument = {
        ...cached,
        ...doc,
        fileName: doc.fileName || cached?.fileName || '',
        guide: this.mergeGuide(cached?.guide, doc.guide)
      };

      this.documentCache[convocatoriaId][doc.id] = mergedDoc;
      merged.push(mergedDoc);
    });

    // Incluir documentos cacheados que no vienen en la respuesta
    Object.keys(this.documentCache[convocatoriaId]).forEach(id => {
      if (!newDocuments.some(d => d.id === id)) {
        merged.push(this.documentCache[convocatoriaId][id]);
      }
    });

    this.emitCacheUpdate();
    return merged;
  }

  // ==================================================================
  // SINCRONIZACIÓN Y VALIDACIÓN
  // ==================================================================

  /**
   * Reemplaza el caché con datos frescos del servidor.
   * @param convocatoriaId ID de la convocatoria
   * @param serverDocuments Documentos del backend
   */
  syncWithServer(convocatoriaId: string, serverDocuments: ConvocatoriaDocument[]): void {
    delete this.documentCache[convocatoriaId];
    this.documentCache[convocatoriaId] = {};

    serverDocuments.forEach(doc => {
      this.cacheDocument(convocatoriaId, doc);
    });
  }

  /**
   * Valida la integridad del caché.
   * @param convocatoriaId ID de la convocatoria
   * @returns Objeto con estado y problemas encontrados
   */
  validateCache(convocatoriaId: string): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    const docs = Object.values(this.documentCache[convocatoriaId] || {});

    docs.forEach(doc => {
      if (!doc.id) issues.push('Document without ID');
      if (!doc.name) issues.push(`Document ${doc.id} without name`);
      if (doc.fileName === undefined) issues.push(`Document ${doc.id} has undefined fileName`);
    });

    return { valid: issues.length === 0, issues };
  }

  // ==================================================================
  // MÉTODOS PRIVADOS
  // ==================================================================

  /** Fusiona información de guía (cached + nueva) */
  private mergeGuide(
    cachedGuide: ConvocatoriaDocument['guide'],
    newGuide: ConvocatoriaDocument['guide']
  ): ConvocatoriaDocument['guide'] | undefined {
    if (!cachedGuide && !newGuide) return undefined;
    return newGuide ? { ...cachedGuide, ...newGuide } : cachedGuide;
  }

  /** Emite actualización del caché a suscriptores */
  private emitCacheUpdate(): void {
    this.cacheSubject.next({ ...this.documentCache });
  }
}