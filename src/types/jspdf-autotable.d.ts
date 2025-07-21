import 'jspdf';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
  namespace jsPDF {
    interface autoTable {
      previous: {
        finalY: number;
      };
    }
  }
} 