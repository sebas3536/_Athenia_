import { Injectable } from '@angular/core';
import { Chart } from 'chart.js/auto';
import { ChartDataPoint } from '../../domain/models/document.model';

@Injectable({
  providedIn: 'root',
})
export class ChartService {
  private formatChartLabel(date: string, timeframe: 'week' | 'month' | 'year'): string {
    const d = new Date(date);
    switch (timeframe) {
      case 'week':
        return `Día ${d.getDate()}`;
      case 'month':
        return `${d.getDate()}/${d.getMonth() + 1}`;
      case 'year':
        return `${d.getMonth() + 1}/${d.getFullYear()}`;
      default:
        return date;
    }
  }

  private formatTooltipDate(date: string): string {
    return new Date(date).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  createUsageChart(canvas: HTMLCanvasElement, data: ChartDataPoint[], timeframe: 'week' | 'month' | 'year'): Chart {
    return new Chart(canvas, {
      type: 'line',
      data: {
        labels: data.map(d => this.formatChartLabel(d.date, timeframe)),
        datasets: [
          {
            label: 'PDF',
            data: data.map(d => d.pdf),
            borderColor: '#e74c3c',
            backgroundColor: 'rgba(231, 76, 60, 0.1)',
            fill: false,
            tension: 0.4,
            pointBackgroundColor: '#e74c3c',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 4,
          },
          {
            label: 'DOCX',
            data: data.map(d => d.docx),
            borderColor: '#3498db',
            backgroundColor: 'rgba(52, 152, 219, 0.1)',
            fill: false,
            tension: 0.4,
            pointBackgroundColor: '#3498db',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 4,
          },
          {
            label: 'TXT',
            data: data.map(d => d.txt),
            borderColor: '#27ae60',
            backgroundColor: 'rgba(39, 174, 96, 0.1)',
            fill: false,
            tension: 0.4,
            pointBackgroundColor: '#27ae60',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { color: '#444', font: { family: 'Inter, sans-serif', weight: 500 }, usePointStyle: true, padding: 20 },
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            cornerRadius: 8,
            displayColors: true,
            callbacks: {
              title: (tooltipItems) => this.formatTooltipDate(data[tooltipItems[0].dataIndex]?.date ?? ''),
              label: context => `${context.dataset.label}: ${context.parsed.y} documentos`,
            },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#666', font: { family: 'Inter, sans-serif', weight: 500 } } },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0, 0, 0, 0.05)' },
            border: { display: false },
            ticks: { color: '#666', font: { family: 'Inter, sans-serif', weight: 500 }, stepSize: 1 },
          },
        },
        interaction: { mode: 'index', intersect: false },
      },
    });
  }

  createDocTypeChart(canvas: HTMLCanvasElement, data: number[]): Chart {
    return new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['PDF', 'DOCX', 'TXT'],
        datasets: [{
          label: 'Tipos de Documentos',
          data,
          backgroundColor: ['#e74c3c', '#3498db', '#27ae60'],
          borderWidth: 0,
          hoverOffset: 10,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          animateRotate: true,
          duration: 1200,
          easing: 'easeOutBounce',
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#444',
              font: { family: 'Inter, sans-serif', size: 14, weight: 500 },
              padding: 20,
              usePointStyle: true,
              pointStyle: 'circle',
            },
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            cornerRadius: 8,
            displayColors: true,
            callbacks: {
              label: context => {
                const count = context.parsed;
                const total = data.reduce((sum, val) => sum + val, 0);
                const percentage = total ? Math.round((count / total) * 100) : 0;
                return `${context.label}: ${count} documentos (${percentage}%)`;
              },
            },
          },
        },
        cutout: '60%',
        elements: { arc: { borderRadius: 8 } },
      },
    });
  }
}