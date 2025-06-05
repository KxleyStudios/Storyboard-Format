class StoryboardFormatter {
  constructor() {
    this.panels = [];
    this.currentPanelIndex = -1;
    this.copiedPanelData = null;
    this.initializeEventListeners();
  }

  initializeEventListeners() {
    document.getElementById('importBtn').addEventListener('click', () => {
      document.getElementById('imageInput').click();
    });

    document.getElementById('imageInput').addEventListener('change', (e) => {
      this.handleImageImport(e.target.files);
    });

    document.getElementById('exportPdfBtn').addEventListener('click', () => {
      this.exportAs2x2PDF();
    });

    document.getElementById('exportSingleBtn').addEventListener('click', () => {
      this.exportSinglePNGs();
    });

    document.getElementById('exportZipBtn').addEventListener('click', () => {
      this.exportAsZip();
    });

    document.getElementById('saveBtn').addEventListener('click', () => {
      this.saveStoryboardFile();
    });

    document.getElementById('loadBtn').addEventListener('click', () => {
      document.getElementById('loadInput').click();
    });

    document.getElementById('loadInput').addEventListener('change', (e) => {
      this.loadStoryboardFile(e.target.files[0]);
    });

    document.getElementById('copyPanelBtn').addEventListener('click', () => {
      this.copyPanelData();
    });

    document.getElementById('pastePanelBtn').addEventListener('click', () => {
      this.pastePanelData();
    });

    document.getElementById('closePanelBtn').addEventListener('click', () => {
      this.closePanelEditor();
    });

    ['sceneInput', 'panelInput', 'dialogInput', 'panelLength'].forEach(id => {
      document.getElementById(id).addEventListener('input', () => {
        this.updateCurrentPanel();
      });
    });
  }

  handleImageImport(files) {
    Array.from(files).forEach((file, index) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const panel = {
            id: Date.now() + index,
            image: e.target.result,
            imageName: file.name,
            scene: '',
            panel: '',
            dialog: '',
            length: ''
          };
          this.panels.push(panel);
          this.renderPanels();
        };
        reader.readAsDataURL(file);
      }
    });
  }

  renderPanels() {
    const grid = document.getElementById('panelsGrid');
    if (this.panels.length === 0) {
      grid.innerHTML = `<div class="empty-state"><i class="fas fa-images"></i><p>Import images to start creating your storyboard</p></div>`;
      return;
    }

    grid.innerHTML = this.panels.map((panel, index) => `
      <div class="panel-item ${index === this.currentPanelIndex ? 'active' : ''}" 
           data-index="${index}" onclick="storyboard.selectPanel(${index})">
        <img src="${panel.image}" alt="${panel.imageName}" class="panel-image">
        <div class="panel-info">
          <div class="scene">${panel.scene || 'Scene not set'}</div>
          <div class="panel-num">${panel.panel || 'Panel not set'}</div>
          <div class="dialog">${panel.dialog || 'No dialog'}</div>
        </div>
      </div>
    `).join('');
  }

  selectPanel(index) {
    this.currentPanelIndex = index;
    this.renderPanels();
    this.showPanelEditor();
    this.loadPanelData();
  }

  showPanelEditor() {
    document.getElementById('panelEditor').style.display = 'block';
  }

  closePanelEditor() {
    document.getElementById('panelEditor').style.display = 'none';
    this.currentPanelIndex = -1;
    this.renderPanels();
  }

  loadPanelData() {
    if (this.currentPanelIndex >= 0 && this.panels[this.currentPanelIndex]) {
      const panel = this.panels[this.currentPanelIndex];
      document.getElementById('sceneInput').value = panel.scene;
      document.getElementById('panelInput').value = panel.panel;
      document.getElementById('dialogInput').value = panel.dialog;
      document.getElementById('panelLength').value = panel.length;
    }
  }

  updateCurrentPanel() {
    if (this.currentPanelIndex >= 0 && this.panels[this.currentPanelIndex]) {
      const panel = this.panels[this.currentPanelIndex];
      panel.scene = document.getElementById('sceneInput').value;
      panel.panel = document.getElementById('panelInput').value;
      panel.dialog = document.getElementById('dialogInput').value;
      panel.length = document.getElementById('panelLength').value;
      this.renderPanels();
    }
  }

  copyPanelData() {
    if (this.currentPanelIndex >= 0 && this.panels[this.currentPanelIndex]) {
      const panel = this.panels[this.currentPanelIndex];
      this.copiedPanelData = {
        scene: panel.scene,
        panel: panel.panel,
        dialog: panel.dialog,
        length: panel.length
      };
      alert('Panel data copied!');
    }
  }

  pastePanelData() {
    if (this.copiedPanelData && this.currentPanelIndex >= 0 && this.panels[this.currentPanelIndex]) {
      const panel = this.panels[this.currentPanelIndex];
      panel.scene = this.copiedPanelData.scene;
      panel.panel = this.copiedPanelData.panel;
      panel.dialog = this.copiedPanelData.dialog;
      panel.length = this.copiedPanelData.length;
      this.loadPanelData();
      this.renderPanels();
      alert('Panel data pasted!');
    }
  }

  saveStoryboardFile() {
    const json = JSON.stringify(this.panels);
    const blob = new Blob([json], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'my_storyboard.storyboardf';
    link.click();
  }

  loadStoryboardFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (Array.isArray(data)) {
          this.panels = data;
          this.currentPanelIndex = -1;
          this.renderPanels();
          alert('Storyboard loaded successfully!');
        } else {
          throw new Error('Invalid storyboard format.');
        }
      } catch (err) {
        alert('Failed to load storyboard: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  async createStoryboardImage(panel, width = 1920, height = 1080) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = width;
      canvas.height = height;

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);

      const img = new Image();
      img.onload = () => {
        const imgAspect = img.width / img.height;
        const canvasAspect = width / height;

        let drawWidth, drawHeight, drawX, drawY;
        if (imgAspect > canvasAspect) {
          drawWidth = width;
          drawHeight = width / imgAspect;
          drawX = 0;
          drawY = (height - drawHeight) / 2;
        } else {
          drawHeight = height;
          drawWidth = height * imgAspect;
          drawX = (width - drawWidth) / 2;
          drawY = 0;
        }

        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, width, 150);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 32px Arial';
        ctx.fillText(`Scene: ${panel.scene || 'N/A'}`, 40, 50);

        ctx.font = 'bold 28px Arial';
        ctx.fillText(`Panel: ${panel.panel || 'N/A'}`, 40, 90);

        if (panel.dialog) {
          ctx.font = '24px Arial';
          const lines = this.wrapText(ctx, panel.dialog, width - 80);
          lines.forEach((line, index) => {
            ctx.fillText(line, 40, 130 + index * 30);
          });
        }

        resolve(canvas.toDataURL('image/png'));
      };
      img.src = panel.image;
    });
  }

  wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + ' ' + word).width;
      if (width < maxWidth) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  }

  async exportSinglePNGs() {
    if (this.panels.length === 0) {
      alert('No panels to export!');
      return;
    }

    for (let i = 0; i < this.panels.length; i++) {
      const panel = this.panels[i];
      const dataUrl = await this.createStoryboardImage(panel);
      const link = document.createElement('a');
      link.download = `panel_${i + 1}_${panel.imageName.split('.')[0]}.png`;
      link.href = dataUrl;
      link.click();
    }
  }

  async exportAsZip() {
    if (this.panels.length === 0) {
      alert('No panels to export!');
      return;
    }

    const zip = new JSZip();
    for (let i = 0; i < this.panels.length; i++) {
      const panel = this.panels[i];
      const dataUrl = await this.createStoryboardImage(panel);
      const base64 = dataUrl.split(',')[1];
      zip.file(`panel_${i + 1}_${panel.imageName.split('.')[0]}.png`, base64, { base64: true });
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.download = 'storyboard_panels.zip';
    link.href = URL.createObjectURL(blob);
    link.click();
  }

  async exportAs2x2PDF() {
    if (this.panels.length === 0) {
      alert('No panels to export!');
      return;
    }

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('landscape', 'mm', 'a4');
    const width = pdf.internal.pageSize.width;
    const height = pdf.internal.pageSize.height;
    const w2 = width / 2 - 15;
    const h2 = height / 2 - 15;

    for (let i = 0; i < this.panels.length; i += 4) {
      if (i !== 0) pdf.addPage();

      for (let j = 0; j < 4 && (i + j) < this.panels.length; j++) {
        const panel = this.panels[i + j];
        const x = (j % 2) * (w2 + 10) + 10;
        const y = Math.floor(j / 2) * (h2 + 10) + 10;

        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = panel.image;
        });

        pdf.addImage(panel.image, 'JPEG', x, y, w2, h2 - 30);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`Scene: ${panel.scene || 'N/A'}`, x, y + h2 - 25);
        pdf.text(`Panel: ${panel.panel || 'N/A'}`, x, y + h2 - 20);
        pdf.setFont('helvetica', 'normal');
        const dialogText = panel.dialog || 'No dialog';
        const lines = pdf.splitTextToSize(dialogText, w2);
        pdf.text(lines.slice(0, 2), x, y + h2 - 15);
      }
    }

    pdf.save('storyboard_2x2.pdf');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.storyboard = new StoryboardFormatter();
});