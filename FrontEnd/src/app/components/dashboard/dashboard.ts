/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-inferrable-types */
/* eslint-disable @angular-eslint/prefer-inject */
import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Chart } from 'chart.js/auto';
import { Subject, takeUntil, finalize, debounceTime, distinctUntilChanged, forkJoin } from 'rxjs';
import { Api } from '../../services/api/api';
import { Auth as AuthService } from '../../components/authentication/auth/auth';
import { ActivityLog, ChartDataPoint, DashboardStats, DocumentType, TimeRange, UserExtended } from 'src/app/domain/models/document.model';
import { UserPreferencesService } from 'src/app/services/api/user-preferences.service';
import { UserService } from 'src/app/services/api/user-service';
import { ProfileAvatar } from "@shared/components/profile-avatar/profile-avatar";
import { User, UserRole } from 'src/app/domain/models/user.model';


@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    LucideAngularModule,
    ProfileAvatar,
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class Dashboard implements OnInit, AfterViewInit, OnDestroy {
  
  // ==================== PROPIEDADES DE FILTROS Y CONFIGURACIÓN ====================
  
  /** Filtro activo para tipo de documento */
  activeFilter: DocumentType | 'all' = 'all';
  
  /** Rango de tiempo seleccionado para visualización de datos */
  timeRange: TimeRange = 'week';
  
  /** Tipos de documentos disponibles para filtrado */
  documentTypes: (DocumentType | 'all')[] = ['all', 'pdf', 'txt', 'docx'];
  
  /** Rangos de tiempo disponibles para selección */
  timeRanges: TimeRange[] = ['week', 'month', 'year'];
  
  /** Consulta de búsqueda ingresada por el usuario */
  searchQuery: string = '';
  
  /** Subject para gestionar el debounce en búsquedas */
  private searchSubject = new Subject<string>();

  /** Indica si el usuario actual tiene rol de administrador */
  isAdmin: boolean = false;

  // ==================== PROPIEDADES DE DATOS ====================
  
  /** Estadísticas generales del dashboard */
  stats: DashboardStats | null = null;
  
  /** Datos para el gráfico de líneas temporal */
  chartData: ChartDataPoint[] = [];
  
  /** Lista completa de actividades recientes */
  recentActivities: ActivityLog[] = [];
  
  /** Actividades filtradas según criterios de búsqueda */
  filteredActivities: ActivityLog[] = [];
  
  /** Actividades de la página actual (paginación) */
  paginatedActivities: ActivityLog[] = [];
  
  /** URL de la foto de perfil del usuario */
  profilePhotoUrl: string | null = null;
  
  /** Vista previa de la foto de perfil */
  photoPreview: string | undefined;
  
  /** Lista de usuarios del sistema (para administradores) */
  users: UserExtended[] = [];

  // ==================== PROPIEDADES DE PAGINACIÓN ====================
  
  /** Página actual de actividades */
  currentActivitiesPage = 1;
  
  /** Número de actividades por página */
  activitiesPerPage = 6;
  
  /** Total de páginas disponibles */
  totalActivitiesPages = 1;
  
  /** Total de actividades filtradas */
  totalActivitiesCount = 0;
  
  /** Índice de inicio de la página actual */
  activitiesPageStart = 0;
  
  /** Índice de fin de la página actual */
  activitiesPageEnd = 0;
  
  /** Máximo de páginas visibles en el paginador */
  maxVisiblePages = 6;

  // ==================== PROPIEDADES DE ESTADO DE CARGA ====================
  
  /** Indica si las estadísticas están cargando */
  isLoadingStats = false;
  
  /** Indica si los datos del gráfico están cargando */
  isLoadingChart = false;
  
  /** Indica si las actividades están cargando */
  isLoadingActivities = false;
  
  /** Indica si se está ejecutando un refresh general */
  isRefreshing = false;
  
  /** Controla la visibilidad del contenido principal */
  showContent = false;

  // ==================== PROPIEDADES DE ERRORES ====================
  
  /** Mensaje de error al cargar estadísticas */
  errorStats: string | null = null;
  
  /** Mensaje de error al cargar gráfico */
  errorChart: string | null = null;
  
  /** Mensaje de error al cargar actividades */
  errorActivities: string | null = null;

  // ==================== CONFIGURACIÓN DE COLORES ====================
  
  /** Mapeo de colores para cada tipo de documento */
  documentColors: Record<DocumentType | 'all', string> = {
    pdf: 'red',
    txt: 'green',
    docx: 'blue',
    all: 'purple'
  };

  // ==================== PROPIEDADES PRIVADAS ====================
  
  /** Instancia del gráfico circular (Chart.js) */
  private pieChartInstance: Chart | null = null;
  
  /** Instancia del gráfico de líneas (Chart.js) */
  private lineChartInstance: Chart | null = null;
  
  /** Subject para gestionar la limpieza de subscripciones */
  private destroy$ = new Subject<void>();
  
  /** Caché de datos procesados para el gráfico circular */
  private pieDataCache: { name: string; value: number; color: string }[] | null = null;
  
  /** Intervalo para auto-refresco de datos */
  private refreshInterval: ReturnType<typeof setInterval> | null = null;
  
  /** Indica si la vista ha sido inicializada */
  private viewInitialized = false;
  
  /** Indica si los gráficos han sido inicializados */
  private chartsInitialized = false;

  // ==================== REFERENCIAS A ELEMENTOS DEL DOM ====================
  
  /** Referencia al canvas del gráfico circular */
  @ViewChild('pieChart') pieChartCanvas!: ElementRef<HTMLCanvasElement>;
  
  /** Referencia al canvas del gráfico de líneas */
  @ViewChild('lineChart') lineChartCanvas!: ElementRef<HTMLCanvasElement>;

  // ==================== CONSTRUCTOR ====================

  constructor(
    private dashboardService: Api,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private preferencesService: UserPreferencesService,
    private userService: UserService,
  ) { }

  // ==================== HOOKS DEL CICLO DE VIDA ====================

  /**
   * Inicialización del componente
   * Configura búsqueda con debounce y verifica autenticación
   */
  ngOnInit(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.filterActivities();
    });

    if (this.authService.isAuthenticated()) {
      this.checkAdminStatus();
    } else {
      this.router.navigate(['/login']);
    }
  }

  /**
   * Hook ejecutado después de inicializar la vista
   * Intenta renderizar los gráficos con un pequeño delay
   */
  ngAfterViewInit(): void {
    this.viewInitialized = true;

    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        this.attemptRenderCharts();
      }, 100);
    });
  }

  /**
   * Limpieza al destruir el componente
   * Destruye gráficos, limpia intervalos y completa observables
   */
  ngOnDestroy(): void {
    this.destroyCharts();
    this.clearAutoRefresh();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==================== MÉTODOS DE AUTENTICACIÓN Y PERMISOS ====================

  /**
   * Verifica si el usuario actual tiene rol de administrador
   * Carga los datos del dashboard después de la verificación
   */
  private checkAdminStatus(): void {
    this.authService.getUserProfile()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (userProfile) => {
          this.isAdmin = userProfile?.role === UserRole.ADMIN;
          this.showContent = true;
          this.loadDashboardData();
          this.cdr.markForCheck();
        },
        error: () => {
          this.isAdmin = false;
          this.showContent = true;
          this.loadDashboardData();
          this.cdr.markForCheck();
        }
      });
  }

  // ==================== MÉTODOS DE CARGA DE DATOS ====================

  /**
   * Carga todos los datos del dashboard en paralelo
   * Utiliza forkJoin para optimizar las peticiones HTTP
   */
  private loadDashboardData(): void {
    this.isLoadingStats = true;
    this.isLoadingChart = true;
    this.isLoadingActivities = true;

    const includeAllUsers = this.isAdmin;

    forkJoin({
      stats: this.dashboardService.getDashboardStats(includeAllUsers),
      chart: this.dashboardService.getChartData('week', includeAllUsers),
      activities: this.dashboardService.getRecentActivities(100, includeAllUsers),
      users: this.userService.getUsers()
    }).pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        this.isLoadingStats = false;
        this.isLoadingChart = false;
        this.isLoadingActivities = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: ({ stats, chart, activities, users }) => {
        this.stats = {
          ...stats,
          typeBreakdown: stats.typeBreakdown?.map(item => ({
            ...item,
            file_type: item.file_type.toLowerCase() as DocumentType
          })) ?? []
        };
        this.pieDataCache = null;

        this.chartData = chart;

        this.recentActivities = activities.map(activity => ({
          ...activity,
          document_type: activity.document_type.toLowerCase() as DocumentType
        }));

        this.users = users.map(user => this.convertToUserExtended(user));

        this.filterActivities();

        this.ngZone.runOutsideAngular(() => {
          setTimeout(() => {
            this.attemptRenderCharts();
          }, 50);
        });
      },
      error: () => {
        this.loadStats();
        this.loadChartData();
        this.loadRecentActivities();
      }
    });
  }

  /**
   * Carga las estadísticas del dashboard
   * Actualiza el gráfico circular después de cargar
   */
  public loadStats(): void {
    if (this.isLoadingStats) return;
    
    this.isLoadingStats = true;
    this.errorStats = null;

    const includeAllUsers = this.isAdmin;

    this.dashboardService.getDashboardStats(includeAllUsers)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoadingStats = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (data: DashboardStats) => {
          this.stats = {
            ...data,
            typeBreakdown: data.typeBreakdown?.map(item => ({
              ...item,
              file_type: item.file_type.toLowerCase() as DocumentType
            })) ?? []
          };
          this.pieDataCache = null;

          this.ngZone.runOutsideAngular(() => {
            setTimeout(() => {
              this.renderOrUpdatePieChart();
            }, 0);
          });
        },
        error: (error: Error) => {
          this.errorStats = `Error al cargar las estadísticas: ${error.message}`;
        }
      });
  }

  /**
   * Carga los datos del gráfico de líneas según el rango temporal seleccionado
   */
  private loadChartData(): void {
    if (this.isLoadingChart) return;
    
    this.isLoadingChart = true;
    this.errorChart = null;

    const includeAllUsers = this.isAdmin;
    const periodMap: Record<TimeRange, 'week' | 'month' | 'year'> = {
      'week': 'week',
      'month': 'month',
      'year': 'year'
    };

    this.dashboardService.getChartData(periodMap[this.timeRange], includeAllUsers)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoadingChart = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (data: ChartDataPoint[]) => {
          this.chartData = data;

          this.ngZone.runOutsideAngular(() => {
            setTimeout(() => {
              this.renderOrUpdateLineChart();
            }, 0);
          });
        },
        error: (error: Error) => {
          this.errorChart = `Error al cargar los datos del gráfico: ${error.message}`;
        }
      });
  }

  /**
   * Carga las actividades recientes del sistema
   * Aplica filtros después de cargar los datos
   */
  public loadRecentActivities(): void {
    if (this.isLoadingActivities) return;
    
    this.isLoadingActivities = true;
    this.errorActivities = null;

    const includeAllUsers = this.isAdmin;

    this.dashboardService.getRecentActivities(100, includeAllUsers)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoadingActivities = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (data: ActivityLog[]) => {
          this.recentActivities = data.map(activity => ({
            ...activity,
            document_type: activity.document_type.toLowerCase() as DocumentType
          }));
          this.filterActivities();
        },
        error: (error: Error) => {
          this.errorActivities = `Error al cargar las actividades: ${error.message}`;
        }
      });
  }

  /**
   * Refresca todos los datos del dashboard
   * @param silent - Si es true, no muestra indicadores de carga
   */
  refreshAllData(silent = false): void {
    if (this.isRefreshing) return;
    
    this.isRefreshing = true;

    if (!silent) {
      this.isLoadingStats = true;
      this.isLoadingChart = true;
      this.isLoadingActivities = true;
    }

    let completed = 0;
    const total = 4;

    const checkComplete = () => {
      completed++;
      if (completed >= total) {
        this.isRefreshing = false;
        if (!silent) {
          this.isLoadingStats = false;
          this.isLoadingChart = false;
          this.isLoadingActivities = false;
        }

        this.ngZone.runOutsideAngular(() => {
          setTimeout(() => {
            this.attemptRenderCharts();
          }, 0);
        });

        this.cdr.markForCheck();
      }
    };

    this.userService.getUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (users) => {
          this.users = users.map(user => this.convertToUserExtended(user));
          checkComplete();
        },
        error: () => {
          checkComplete();
        }
      });
  }

  // ==================== MÉTODOS DE RENDERIZADO DE GRÁFICOS ====================

  /**
   * Intenta renderizar ambos gráficos si la vista está inicializada
   */
  private attemptRenderCharts(): void {
    if (!this.viewInitialized) return;

    this.renderOrUpdatePieChart();
    this.renderOrUpdateLineChart();
    this.chartsInitialized = true;
  }

  /**
   * Renderiza o actualiza el gráfico circular según disponibilidad de datos
   */
  private renderOrUpdatePieChart(): void {
    const hasPieCanvas = !!this.pieChartCanvas?.nativeElement;
    const hasPieData = this.hasPieChartData();

    if (hasPieData && hasPieCanvas) {
      if (this.pieChartInstance) {
        this.updatePieChart();
      } else {
        this.renderPieChart();
      }
    } else {
      if (this.pieChartInstance && !hasPieData) {
        this.pieChartInstance.destroy();
        this.pieChartInstance = null;
      }
    }
  }

  /**
   * Renderiza o actualiza el gráfico de líneas según disponibilidad de datos
   */
  private renderOrUpdateLineChart(): void {
    const hasLineCanvas = !!this.lineChartCanvas?.nativeElement;
    const hasLineData = this.chartData.length > 0;

    if (hasLineData && hasLineCanvas) {
      if (this.lineChartInstance) {
        this.updateLineChart();
      } else {
        this.renderLineChart();
      }
    } else {
      if (this.lineChartInstance && !hasLineData) {
        this.lineChartInstance.destroy();
        this.lineChartInstance = null;
      }
    }
  }

  /**
   * Crea una nueva instancia del gráfico circular tipo doughnut
   * Configura estilos, tooltips y animaciones
   */
  private renderPieChart(): void {
    if (!this.pieChartCanvas?.nativeElement) return;

    const pieData = this.getPieData();
    if (!this.hasPieChartData()) return;

    try {
      this.pieChartInstance = new Chart(this.pieChartCanvas.nativeElement, {
        type: 'doughnut',
        data: {
          labels: pieData.map(item => item.name),
          datasets: [{
            data: pieData.map(item => item.value),
            backgroundColor: pieData.map(item => this.getColorValue(item.name.toLowerCase())),
            borderWidth: 3,
            borderColor: '#ffffff',
            hoverOffset: 10
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            duration: 800,
            easing: 'easeInOutQuart'
          },
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              padding: 12,
              cornerRadius: 8,
              titleFont: { size: 14, weight: 'bold' },
              bodyFont: { size: 13 },
              callbacks: {
                label: (context) => {
                  const label = context.label || '';
                  const value = context.parsed || 0;
                  const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0) as number;
                  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                  return ` ${label}: ${value} (${percentage}%)`;
                }
              }
            }
          }
        }
      });
    } catch (error) {
      // Error silencioso
    }
  }

  /**
   * Actualiza los datos del gráfico circular existente sin recrearlo
   */
  private updatePieChart(): void {
    if (!this.pieChartInstance) {
      this.renderPieChart();
      return;
    }

    const pieData = this.getPieData();

    if (!this.hasPieChartData()) {
      this.pieChartInstance.destroy();
      this.pieChartInstance = null;
      this.cdr.detectChanges();
      return;
    }

    this.pieChartInstance.data.labels = pieData.map(item => item.name);
    this.pieChartInstance.data.datasets[0].data = pieData.map(item => item.value);
    this.pieChartInstance.data.datasets[0].backgroundColor = pieData.map(item => this.getColorValue(item.name.toLowerCase()));
    this.pieChartInstance.update('active');
  }

  /**
   * Crea una nueva instancia del gráfico de líneas temporal
   * Muestra la evolución de documentos por tipo a lo largo del tiempo
   */
  private renderLineChart(): void {
    if (!this.lineChartCanvas?.nativeElement) return;
    if (!this.chartData || this.chartData.length === 0) return;

    try {
      const labels = this.chartData.map(item => item.label || '');
      const pdfData = this.chartData.map(item => item.pdf || 0);
      const docxData = this.chartData.map(item => item.docx || 0);
      const txtData = this.chartData.map(item => item.txt || 0);

      this.lineChartInstance = new Chart(this.lineChartCanvas.nativeElement, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'PDF',
              data: pdfData,
              borderColor: this.getColorValue('pdf'),
              backgroundColor: this.hexToRgba(this.getColorValue('pdf'), 0.1),
              borderWidth: 3,
              fill: true,
              tension: 0.4,
              pointRadius: 4,
              pointHoverRadius: 6,
              pointBackgroundColor: this.getColorValue('pdf'),
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2
            },
            {
              label: 'DOCX',
              data: docxData,
              borderColor: this.getColorValue('docx'),
              backgroundColor: this.hexToRgba(this.getColorValue('docx'), 0.1),
              borderWidth: 3,
              fill: true,
              tension: 0.4,
              pointRadius: 4,
              pointHoverRadius: 6,
              pointBackgroundColor: this.getColorValue('docx'),
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2
            },
            {
              label: 'TXT',
              data: txtData,
              borderColor: this.getColorValue('txt'),
              backgroundColor: this.hexToRgba(this.getColorValue('txt'), 0.1),
              borderWidth: 3,
              fill: true,
              tension: 0.4,
              pointRadius: 4,
              pointHoverRadius: 6,
              pointBackgroundColor: this.getColorValue('txt'),
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2
            }
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            duration: 800,
            easing: 'easeInOutQuart'
          },
          interaction: {
            mode: 'index',
            intersect: false,
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                precision: 0,
                font: { size: 11 }
              },
              grid: {
                color: 'rgba(0, 0, 0, 0.05)'
              }
            },
            x: {
              grid: {
                display: false
              },
              ticks: {
                font: { size: 11 }
              }
            }
          },
          plugins: {
            legend: {
              position: 'top',
              labels: {
                padding: 15,
                font: { size: 12, weight: 500 },
                usePointStyle: true,
                pointStyle: 'circle'
              }
            },
            tooltip: {
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              padding: 12,
              cornerRadius: 8,
              titleFont: { size: 14, weight: 'bold' },
              bodyFont: { size: 13 },
              mode: 'index',
              intersect: false
            }
          }
        }
      });
    } catch (error) {
      // Error silencioso
    }
  }

  /**
   * Actualiza los datos del gráfico de líneas existente
   */
  private updateLineChart(): void {
    if (!this.lineChartInstance) {
      this.renderLineChart();
      return;
    }

    const labels = this.chartData.map(item => item.label || '');
    const pdfData = this.chartData.map(item => item.pdf || 0);
    const docxData = this.chartData.map(item => item.docx || 0);
    const txtData = this.chartData.map(item => item.txt || 0);

    this.lineChartInstance.data.labels = labels;
    this.lineChartInstance.data.datasets[0].data = pdfData;
    this.lineChartInstance.data.datasets[1].data = docxData;
    this.lineChartInstance.data.datasets[2].data = txtData;
    this.lineChartInstance.update('active');
  }

  /**
   * Destruye ambas instancias de gráficos de Chart.js
   */
  private destroyCharts(): void {
    if (this.pieChartInstance) {
      this.pieChartInstance.destroy();
      this.pieChartInstance = null;
    }
    if (this.lineChartInstance) {
      this.lineChartInstance.destroy();
      this.lineChartInstance = null;
    }
    this.chartsInitialized = false;
  }

  // ==================== MÉTODOS DE FILTRADO Y BÚSQUEDA ====================

  /**
   * Establece el filtro activo por tipo de documento
   * Actualiza el gráfico circular y filtra las actividades
   * @param filter - Tipo de documento o 'all' para mostrar todos
   */
  setActiveFilter(filter: DocumentType | 'all'): void {
    this.activeFilter = filter;
    this.pieDataCache = null;

    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        this.renderOrUpdatePieChart();
      }, 0);
    });

    this.filterActivities();
  }

  /**
   * Establece el rango de tiempo para el gráfico de líneas
   * @param range - Rango temporal (week, month, year)
   */
  setTimeRange(range: TimeRange): void {
    if (this.timeRange === range) return;
    
    this.timeRange = range;
    this.loadChartData();
  }

  /**
   * Manejador del input de búsqueda
   * Emite el valor al subject para aplicar debounce
   */
  public onSearchInput(): void {
    this.searchSubject.next(this.searchQuery);
  }

  /**
   * Filtra las actividades según el filtro activo y la consulta de búsqueda
   * Resetea la paginación después de filtrar
   */
  public filterActivities(): void {
    let filtered = this.recentActivities;

    if (this.activeFilter !== 'all') {
      filtered = filtered.filter(activity =>
        activity.document_type.toLowerCase() === this.activeFilter.toLowerCase()
      );
    }

    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(activity =>
        activity.user_name.toLowerCase().includes(query) ||
        activity.document_name.toLowerCase().includes(query)
      );
    }

    this.filteredActivities = filtered;
    this.totalActivitiesCount = this.filteredActivities.length;
    this.currentActivitiesPage = 1;
    this.updatePaginatedActivities();
    this.cdr.markForCheck();
  }

  // ==================== MÉTODOS DE PAGINACIÓN ====================

  /**
   * Actualiza las actividades visibles según la página actual
   * Calcula los índices de inicio y fin
   */
  private updatePaginatedActivities(): void {
    const start = (this.currentActivitiesPage - 1) * this.activitiesPerPage;
    const end = start + this.activitiesPerPage;
    this.paginatedActivities = this.filteredActivities.slice(start, end);
    this.totalActivitiesPages = Math.ceil(this.totalActivitiesCount / this.activitiesPerPage);
    this.activitiesPageStart = this.totalActivitiesCount > 0 ? start + 1 : 0;
    this.activitiesPageEnd = Math.min(end, this.totalActivitiesCount);
  }

  /**
   * Navega a una página específica de actividades
   * @param page - Número de página o string (para ellipsis)
   */
  goToActivitiesPage(page: number | string): void {
    if (typeof page === 'string') return;
    if (page < 1 || page > this.totalActivitiesPages) return;
    
    this.currentActivitiesPage = page;
    this.updatePaginatedActivities();
    this.cdr.markForCheck();
  }

  /**
   * Genera el array de números de página para el paginador
   * Incluye ellipsis (...) cuando hay muchas páginas
   * @returns Array con números de página y strings '...'
   */
  getActivitiesPageNumbers(): (number | string)[] {
    const pages: (number | string)[] = [];

    if (this.totalActivitiesPages <= this.maxVisiblePages + 2) {
      for (let i = 1; i <= this.totalActivitiesPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (this.currentActivitiesPage > 3) {
        pages.push('...');
      }

      const start = Math.max(2, this.currentActivitiesPage - 1);
      const end = Math.min(this.totalActivitiesPages - 1, this.currentActivitiesPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (this.currentActivitiesPage < this.totalActivitiesPages - 2) {
        pages.push('...');
      }

      pages.push(this.totalActivitiesPages);
    }

    return pages;
  }

  // ==================== MÉTODOS DE PROCESAMIENTO DE DATOS ====================

  /**
   * Convierte un objeto User a UserExtended
   * Agrega propiedades adicionales con valores por defecto
   * @param user - Usuario base
   * @returns Usuario extendido con propiedades adicionales
   */
  private convertToUserExtended(user: User): UserExtended {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      created_at: user.created_at || new Date().toISOString(),
      last_login: null,
      is_active: user.is_active ?? true,
      documentsCount: 0,
      lastActivity: 'Sin actividad',
      documents: [],
      profile_photo_url: (user as any).profile_photo_url || null
    };
  }

  /**
   * Obtiene los datos procesados para el gráfico circular
   * Aplica caché para evitar recálculos innecesarios
   * @returns Array de objetos con nombre, valor y color
   */
  getPieData(): { name: string; value: number; color: string }[] {
    if (this.pieDataCache) {
      return this.pieDataCache;
    }

    if (!this.stats?.typeBreakdown) return [];

    let result: { name: string; value: number; color: string }[];

    if (this.activeFilter === 'all') {
      result = this.stats.typeBreakdown
        .filter(item => item.count > 0)
        .map(item => ({
          name: item.file_type.toUpperCase(),
          value: item.count,
          color: this.getColorValue(item.file_type.toLowerCase())
        }));
    } else {
      const typeData = this.stats.typeBreakdown.find(
        item => item.file_type.toLowerCase() === this.activeFilter.toLowerCase()
      );

      result = typeData && typeData.count > 0 ? [{
        name: this.activeFilter.toUpperCase(),
        value: typeData.count,
        color: this.getColorValue(this.activeFilter.toLowerCase())
      }] : [];
    }

    this.pieDataCache = result;
    return result;
  }

  /**
   * Verifica si hay datos válidos para mostrar en el gráfico circular
   * @returns true si hay al menos un elemento con valor mayor a 0
   */
  hasPieChartData(): boolean {
    const pieData = this.getPieData();
    return pieData.length > 0 && pieData.some(item => item.value > 0);
  }

  /**
   * Obtiene el total de documentos según el filtro activo
   * @returns Total de documentos filtrados
   */
  getTotalDocuments(): number {
    if (!this.stats) return 0;
    
    return this.activeFilter === 'all'
      ? this.stats.totalDocuments || 0
      : this.stats.typeBreakdown?.find(item => item.file_type.toLowerCase() === this.activeFilter.toLowerCase())?.count ?? 0;
  }

  /**
   * Obtiene el conteo de documentos por tipo específico
   * @param type - Tipo de documento
   * @returns Cantidad de documentos del tipo especificado
   */
  getDocumentCountByType(type: DocumentType | 'all'): number {
    if (type === 'all') return this.stats?.totalDocuments || 0;
    
    return this.stats?.typeBreakdown?.find(item => item.file_type.toLowerCase() === type.toLowerCase())?.count ?? 0;
  }

  /**
   * Busca un usuario por ID en la lista cargada
   * @param userId - ID del usuario
   * @returns Usuario extendido o undefined si no existe
   */
  getUserById(userId: number): UserExtended | undefined {
    return this.users.find(u => u.id === userId);
  }

  // ==================== MÉTODOS DE UTILIDADES Y HELPERS ====================

  /**
   * Limpia el intervalo de auto-refresco
   */
  private clearAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  /**
   * Obtiene el color hexadecimal asociado a un tipo de documento
   * @param type - Tipo de documento
   * @returns Color en formato hexadecimal
   */
  public getColorValue(type: string): string {
    return {
      pdf: '#ef4444',
      txt: '#02ab74',
      docx: '#3b82f6',
      all: '#7209b7'
    }[type.toLowerCase()] ?? '#6b7280';
  }

  /**
   * Convierte un color hexadecimal a formato RGBA
   * @param hex - Color en formato hexadecimal
   * @param alpha - Valor de transparencia (0-1)
   * @returns Color en formato rgba()
   */
  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * Obtiene las iniciales de un nombre
   * @param name - Nombre completo
   * @returns Iniciales en mayúsculas (máximo 2 caracteres)
   */
  getUserInitials(name: string): string {
    if (!name) return '??';
    
    const names = name.split(' ');
    return names.length >= 2
      ? (names[0][0] + names[1][0]).toUpperCase()
      : name.substring(0, 2).toUpperCase();
  }

  /**
   * Alias de getUserInitials para compatibilidad
   * @param name - Nombre completo
   * @returns Iniciales en mayúsculas
   */
  getInitials(name: string): string {
    if (!name) return '??';
    
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  /**
   * Obtiene el ícono correspondiente a una acción
   * @param action - Tipo de acción
   * @returns Nombre del ícono de Lucide
   */
  getActionIcon(action: string): string {
    const iconMap: Record<string, string> = {
      upload: 'Upload',
      download: 'Download',
      view: 'Eye',
      delete: 'Trash2',
      share: 'Share'
    };
    return iconMap[action.toLowerCase()] ?? 'FileText';
  }

  /**
   * Obtiene las clases CSS de color para una acción
   * @param action - Tipo de acción
   * @returns Clases Tailwind CSS
   */
  getActionColorClass(action: string): string {
    const colorMap: Record<string, string> = {
      upload: 'bg-green-100 text-green-700',
      download: 'bg-blue-100 text-blue-700',
      view: 'bg-purple-100 text-purple-700',
      delete: 'bg-red-100 text-red-700',
      share: 'bg-yellow-100 text-yellow-700'
    };
    return colorMap[action.toLowerCase()] ?? 'bg-gray-100 text-gray-700';
  }

  /**
   * Obtiene las clases CSS de color para un tipo de archivo
   * @param fileType - Tipo de archivo
   * @returns Clases Tailwind CSS
   */
  getFileTypeColorClass(fileType?: string): string {
    const colorMap: Record<string, string> = {
      pdf: 'bg-red-100 text-red-700',
      docx: 'bg-blue-100 text-blue-700',
      txt: 'bg-green-100 text-green-700',
    };

    return colorMap[fileType?.toLowerCase() || ''] || 'bg-gray-100 text-gray-700';
  }

  // ==================== MÉTODOS DE FORMATEO ====================

  /**
   * Formatea bytes a unidades legibles (KB, MB, GB)
   * @param bytes - Cantidad de bytes
   * @returns String formateado con unidad
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
  }

  /**
   * Formatea una fecha a formato legible en español
   * Aplica ajuste de zona horaria UTC-5
   * @param dateString - String de fecha ISO
   * @returns Fecha formateada (ej: "23 oct 2025")
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const utcMinus5 = new Date(date.getTime() - (5 * 60 * 60 * 1000));

    return utcMinus5.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  /**
   * Formatea una hora a formato de 24 horas
   * Aplica ajuste de zona horaria UTC-5
   * @param dateString - String de fecha ISO
   * @returns Hora formateada (ej: "14:30")
   */
  formatTime(dateString: string): string {
    const date = new Date(dateString);
    const utcMinus5 = new Date(date.getTime() - (5 * 60 * 60 * 1000));

    return utcMinus5.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Obtiene la fecha actual formateada para nombres de archivo
   * Aplica ajuste de zona horaria UTC-5
   * @returns Fecha formateada con guiones (ej: "23-oct-2025")
   */
  getCurrentDate(): string {
    const today = new Date();
    const utcMinus5 = new Date(today.getTime() - (5 * 60 * 60 * 1000));

    return utcMinus5.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).replace(/ /g, '-');
  }

  // ==================== MÉTODOS DE EXPORTACIÓN ====================

  /**
   * Exporta las actividades filtradas a un archivo CSV
   * Escapa caracteres especiales según estándar CSV
   */
  exportActivities(): void {
    const headers = ['Usuario', 'Documento', 'Tipo', 'Acción', 'Fecha', 'Hora'];
    const data = this.filteredActivities.map(activity => [
      activity.user_name,
      activity.document_name,
      activity.document_type.toUpperCase(),
      activity.action,
      this.formatDate(activity.timestamp),
      this.formatTime(activity.timestamp)
    ]);

    const escapeCSV = (field: string) => {
      if (field.includes(',') || field.includes('"') || field.includes('\n')) {
        return `"${field.replace(/"/g, '""')}"`;
      }
      return field;
    };

    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...data.map(row => row.map(escapeCSV).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const filename = this.isAdmin ? 'actividades_todos_usuarios' : 'actividades';
    link.setAttribute('download', `${filename}_${this.getCurrentDate()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}
