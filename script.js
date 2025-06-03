class StoryboardFormatter {
    constructor() {
        this.panels = [];
        this.currentPanelIndex = -1;
        this.clipboardData = null;
        this.projectName = 'Untitled Project';
        this.autoSaveInterval = null;
        this.hasUnsavedChanges = false;
        this.init();
    }

    init() {
        this.bindEvents();
        this.setupDragDrop();
        this.loadAutoSave();
        this.startAutoSave();
        this.setupBeforeUnload();
    }

    bindEvents() {
        // Project management
        document.getElementById('new-project').addEventListener('click', () => this.newProject());
        document.getElementById('save-project').addEventListener('click', () => this.saveProject());
        document.getElementById('load-project').addEventListener('click', () => {
            document.getElementById('project-input').click();
        });
        document.getElementById('project-input').addEventListener('change', (e) => {
            this.loadProject(e.target.files[0]);
        });

        // Import button
        document.getElementById('import-btn').addEventListener('click', () => {
            document.getElementById('file-input').click();
        });

        // File input
        document.getElementById('file-input').addEventListener('change', (e) => {
            this.handleFileImport(e.target.files);
        });

        // Export buttons
        document.getElementById('export-pdf').addEventListener('click', () => this.exportPDF());
        document.getElementById('export-single').addEventListener('click', () => this.exportSinglePanels());
        document.getElementById('export-zip').addEventListener('click', () => this.exportZIP());

        // Editor controls
        document.getElementById('close-editor').addEventListener('click', () => this.closeEditor());
        document.getElementById('copy-panel').addEventListener('click', () => this.copyPanelData());
        document.getElementById('paste-panel').addEventListener('click', () => this.pastePanelData());
        document.getElementById('delete-panel').addEventListener('click', () => this.deletePanel());

        // Editor inputs
        const inputs = ['scene-input', 'shot-input', 'description-input', 'dialogue-input', 'direction-input', 'camera-input', 'duration-input'];
        inputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', () => {
                    this.updateCurrentPanel();
                    this.markUnsaved();
                });
            }
        });

        // Close editor when clicking outside of it
        document.addEventListener('click', (e) => {
            const editor = document.getElementById('panel-editor');
            if (editor.classList.contains('open') && !editor.contains(e.target)) {
                this.closeEditor();
            }
        });
    }

    setupDragDrop() {
        const container = document.getElementById('panels-container');
        
        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            container.classList.add('drag-over');
        });

        container.addEventListener('dragleave', (e) => {
            // Only remove drag-over if we're actually leaving the container
            if (!container.contains(e.relatedTarget)) {
                container.classList.remove('drag-over');
            }
        });

        container.addEventListener('drop', (e) => {
            e.preventDefault();
            container.classList.remove('drag-over');
            this.handleFileImport(e.dataTransfer.files);
        });
    }

    async handleFileImport(files) {
        const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
        
        if (imageFiles.length === 0) {
            alert('No valid image files selected. Please choose image files (JPG, PNG, GIF, etc.)');
            return;
        }

        for (const file of imageFiles) {
            try {
                const imageUrl = await this.fileToDataURL(file);
                const panel = {
                    id: Date.now() + Math.random(),
                    image: imageUrl,
                    scene: `Scene ${this.panels.length + 1}`,
                    shot: `Panel ${this.panels.length + 1}`,
                    description: '',
                    dialogue: '',
                    direction: '',
                    camera: '',
                    duration: 5
                };
                this.panels.push(panel);
            } catch (error) {
                console.error('Error processing file:', file.name, error);
            }
        }

        this.renderPanels();
        this.markUnsaved();
    }

    fileToDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(file);
        });
    }

    renderPanels() {
        const container = document.getElementById('panels-container');
        
        if (this.panels.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-images"></i>
                    <h2>No panels yet</h2>
                    <p>Import images to start creating your storyboard</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.panels.map((panel, index) => `
            <div class="panel-card ${index === this.currentPanelIndex ? 'active' : ''}" 
                 data-index="${index}" onclick="storyboard.selectPanel(${index})">
                <button class="panel-delete" onclick="event.stopPropagation(); storyboard.deletePanelByIndex(${index})" title="Delete Panel">
                    <i class="fas fa-trash"></i>
                </button>
                <div class="panel-header">
                    <span class="panel-number">${panel.scene} - ${panel.shot}</span>
                    <span class="panel-duration">${panel.duration}s</span>
                </div>
                <img src="${panel.image}" alt="Panel ${index + 1}" class="panel-image" onerror="this.style.display='none'">
                <div class="panel-info">
                    <div><label>DESC:</label><span>${this.truncateText(panel.description || 'No description', 50)}</span></div>
                    <div><label>DIALOG:</label><span>${this.truncateText(panel.dialogue || 'No dialogue', 50)}</span></div>
                    <div><label>DIR:</label><span>${this.truncateText(panel.direction || 'No direction', 50)}</span></div>
                    <div><label>CAM:</label><span>${this.truncateText(panel.camera || 'No camera notes', 50)}</span></div>
                </div>
            </div>
        `).join('');
    }

    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    selectPanel(index) {
        this.currentPanelIndex = index;
        this.renderPanels();
        this.openEditor();
        this.populateEditor();
    }

    openEditor() {
        const editor = document.getElementById('panel-editor');
        editor.classList.add('open');
    }

    closeEditor() {
        const editor = document.getElementById('panel-editor');
        editor.classList.remove('open');
        this.currentPanelIndex = -1;
        this.renderPanels();
    }

    populateEditor() {
        if (this.currentPanelIndex === -1 || !this.panels[this.currentPanelIndex]) return;
        
        const panel = this.panels[this.currentPanelIndex];
        document.getElementById('scene-input').value = panel.scene || '';
        document.getElementById('shot-input').value = panel.shot || '';
        document.getElementById('description-input').value = panel.description || '';
        document.getElementById('dialogue-input').value = panel.dialogue || '';
        document.getElementById('direction-input').value = panel.direction || '';
        document.getElementById('camera-input').value = panel.camera || '';
        document.getElementById('duration-input').value = panel.duration || 5;
    }

    updateCurrentPanel() {
        if (this.currentPanelIndex === -1 || !this.panels[this.currentPanelIndex]) return;
        
        const panel = this.panels[this.currentPanelIndex];
        panel.scene = document.getElementById('scene-input').value;
        panel.shot = document.getElementById('shot-input').value;
        panel.description = document.getElementById('description-input').value;
        panel.dialogue = document.getElementById('dialogue-input').value;
        panel.direction = document.getElementById('direction-input').value;
        panel.camera = document.getElementById('camera-input').value;
        panel.duration = parseFloat(document.getElementById('duration-input').value) || 5;
        
        this.renderPanels();
    }

    copyPanelData() {
        if (this.currentPanelIndex === -1 || !this.panels[this.currentPanelIndex]) return;
        
        const panel = this.panels[this.currentPanelIndex];
        this.clipboardData = {
            scene: panel.scene,
            shot: panel.shot,
            description: panel.description,
            dialogue: panel.dialogue,
            direction: panel.direction,
            camera: panel.camera,
            duration: panel.duration
        };
        
        this.showSaveIndicator('Panel data copied!', 'saved');
    }

    pastePanelData() {
        if (this.currentPanelIndex === -1 || !this.panels[this.currentPanelIndex] || !this.clipboardData) return;
        
        const panel = this.panels[this.currentPanelIndex];
        Object.assign(panel, this.clipboardData);
        
        this.populateEditor();
        this.renderPanels();
        this.markUnsaved();
        this.showSaveIndicator('Panel data pasted!', 'saved');
    }

    deletePanel() {
        if (this.currentPanelIndex === -1 || !this.panels[this.currentPanelIndex]) return;
        
        if (confirm('Are you sure you want to delete this panel?')) {
            this.panels.splice(this.currentPanelIndex, 1);
            this.closeEditor();
            this.renderPanels();
            this.markUnsaved();
        }
    }

    deletePanelByIndex(index) {
        if (confirm('Are you sure you want to delete this panel?')) {
            this.panels.splice(index, 1);
            
            // If we're deleting the currently edited panel, close the editor
            if (this.currentPanelIndex === index) {
                this.closeEditor();
            } else if (this.currentPanelIndex > index) {
                // Adjust current panel index if needed
                this.currentPanelIndex--;
            }
            
            this.renderPanels();
            this.markUnsaved();
        }
    }

    // Project Management
    newProject() {
        if (this.hasUnsavedChanges && !confirm('You have unsaved changes. Are you sure you want to create a new project?')) {
            return;
        }

        this.panels = [];
        this.currentPanelIndex = -1;
        this.projectName = 'Untitled Project';
        this.hasUnsavedChanges = false;
        this.closeEditor();
        this.renderPanels();
        this.updateTitle();
        this.clearAutoSave();
    }

    saveProject() {
        const projectData = {
            name: this.projectName,
            panels: this.panels,
            version: '1.0',
            created: new Date().toISOString(),
            lastModified: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${this.projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        this.hasUnsavedChanges = false;
        this.showSaveIndicator('Project saved!', 'saved');
    }

    async loadProject(file) {
        if (!file) return;

        if (this.hasUnsavedChanges && !confirm('You have unsaved changes. Are you sure you want to load a new project?')) {
            return;
        }

        try {
            const text = await file.text();
            const projectData = JSON.parse(text);

            if (!projectData.panels || !Array.isArray(projectData.panels)) {
                throw new Error('Invalid project file format');
            }

            this.panels = projectData.panels;
            this.projectName = projectData.name || 'Loaded Project';
            this.currentPanelIndex = -1;
            this.hasUnsavedChanges = false;
            
            this.closeEditor();
            this.renderPanels();
            this.updateTitle();
            this.showSaveIndicator('Project loaded!', 'saved');

        } catch (error) {
            alert('Error loading project file: ' + error.message);
        }
    }

    // Auto-save functionality
    startAutoSave() {
        this.autoSaveInterval = setInterval(() => {
            this.autoSave();
        }, 30000); // Auto-save every 30 seconds
    }

    autoSave() {
        if (this.panels.length === 0) return;

        const autoSaveData = {
            panels: this.panels,
            projectName: this.projectName,
            timestamp: new Date().toISOString()
        };

        try {
            const data = JSON.stringify(autoSaveData);
            // Store in memory instead of localStorage
            window.storyboardAutoSave = data;
            this.showSaveIndicator('Auto-saved', 'saved');
        } catch (error) {
            console.warn('Auto-save failed:', error);
        }
    }

    loadAutoSave() {
        try {
            const data = window.storyboardAutoSave;
            if (data) {
                const autoSaveData = JSON.parse(data);
                if (autoSaveData.panels && autoSaveData.panels.length > 0) {
                    if (confirm('Found auto-saved work. Would you like to restore it?')) {
                        this.panels = autoSaveData.panels;
                        this.projectName = autoSaveData.projectName || 'Recovered Project';
                        this.renderPanels();
                        this.updateTitle();
                        this.showSaveIndicator('Auto-save restored', 'saved');
                    }
                }
            }
        } catch (error) {
            console.warn('Could not load auto-save:', error);
        }
    }

    clearAutoSave() {
        delete window.storyboardAutoSave;
    }

    markUnsaved() {
        this.hasUnsavedChanges = true;
        this.updateTitle();
    }

    updateTitle() {
        const indicator = this.hasUnsavedChanges ? ' *' : '';
        document.title = `${this.projectName}${indicator} - Storyboard Formatter`;
    }

    showSaveIndicator(message, type = 'saving') {
        const indicator = document.getElementById('auto-save-indicator');
        const status = document.getElementById('save-status');
        
        if (indicator && status) {
            status.textContent = message;
            indicator.className = `auto-save-indicator show ${type}`;
            
            setTimeout(() => {
                indicator.classList.remove('show');
            }, 2000);
        }
    }

    setupBeforeUnload() {
        window.addEventListener('beforeunload', (e) => {
            if (this.hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
                return e.returnValue;
            }
        });
    }

    async exportPDF() {
        if (this.panels.length === 0) {
            alert('No panels to export!');
            return;
        }

        if (!window.jspdf) {
            alert('PDF export library not loaded. Please refresh the page and try again.');
            return;
        }

        try {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('landscape', 'mm', 'a4');
            const pageWidth = 297;
            const pageHeight = 210;
            const panelWidth = (pageWidth - 30) / 2;
            const panelHeight = (pageHeight - 30) / 2;
            
            let currentPage = 0;

            for (let i = 0; i < this.panels.length; i += 4) {
                if (currentPage > 0) pdf.addPage();
                
                const panelsOnPage = this.panels.slice(i, i + 4);
                
                for (let j = 0; j < panelsOnPage.length; j++) {
                    const panel = panelsOnPage[j];
                    const x = 10 + (j % 2) * (panelWidth + 10);
                    const y = 10 + Math.floor(j / 2) * (panelHeight + 10);
                    
                    // Draw panel border
                    pdf.rect(x, y, panelWidth, panelHeight);
                    
                    // Add image
                    try {
                        pdf.addImage(panel.image, 'JPEG', x + 5, y + 5, panelWidth - 70, 60);
                    } catch (e) {
                        console.warn('Could not add image to PDF:', e);
                    }
                    
                    // Add text information
                    pdf.setFontSize(8);
                    pdf.text(`${panel.scene} - ${panel.shot}`, x + 5, y + 75);
                    
                    const maxWidth = panelWidth - 10;
                    pdf.text(`DESC: ${panel.description || 'N/A'}`, x + 5, y + 82, { maxWidth });
                    pdf.text(`DIALOG: ${panel.dialogue || 'N/A'}`, x + 5, y + 90, { maxWidth });
                    pdf.text(`DIR: ${panel.direction || 'N/A'}`, x + 5, y + 98, { maxWidth });
                    pdf.text(`CAM: ${panel.camera || 'N/A'}`, x + 5, y + 106, { maxWidth });
                }
                
                currentPage++;
            }
            
            pdf.save('storyboard.pdf');
            this.showSaveIndicator('PDF exported!', 'saved');
        } catch (error) {
            console.error('PDF export error:', error);
            alert('Error exporting PDF: ' + error.message);
        }
    }

    async exportSinglePanels() {
        if (this.panels.length === 0) {
            alert('No panels to export!');
            return;
        }

        try {
            for (let i = 0; i < this.panels.length; i++) {
                const canvas = await this.createSinglePanelCanvas(this.panels[i], i);
                const link = document.createElement('a');
                link.download = `panel_${String(i + 1).padStart(3, '0')}.png`;
                link.href = canvas.toDataURL();
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                // Add a small delay to prevent browser blocking
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            this.showSaveIndicator('Single panels exported!', 'saved');
        } catch (error) {
            console.error('Single panel export error:', error);
            alert('Error exporting single panels: ' + error.message);
        }
    }

    async exportZIP() {
        if (this.panels.length === 0) {
            alert('No panels to export!');
            return;
        }

        if (!window.JSZip) {
            alert('ZIP export library not loaded. Please refresh the page and try again.');
            return;
        }

        try {
            const zip = new JSZip();
            
            for (let i = 0; i < this.panels.length; i++) {
                const canvas = await this.createSinglePanelCanvas(this.panels[i], i);
                const dataUrl = canvas.toDataURL();
                const base64Data = dataUrl.split(',')[1];
                zip.file(`panel_${String(i + 1).padStart(3, '0')}.png`, base64Data, { base64: true });
            }
            
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const link = document.createElement('a');
            link.download = 'storyboard_panels.zip';
            link.href = URL.createObjectURL(zipBlob);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
            
            this.showSaveIndicator('ZIP exported!', 'saved');
        } catch (error) {
            console.error('ZIP export error:', error);
            alert('Error exporting ZIP: ' + error.message);
        }
    }

    async createSinglePanelCanvas(panel, index) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = 1920;
        canvas.height = 1080;

        // Draw black background
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Load and draw image centered and scaled
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = panel.image;
        });

        const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
        const imgW = img.width * scale;
        const imgH = img.height * scale;
        const imgX = (canvas.width - imgW) / 2;
        const imgY = (canvas.height - imgH) / 2;
        ctx.drawImage(img, imgX, imgY, imgW, imgH);

        // Overlay translucent box for text
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, 220);

        // Text settings
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 32px Courier New';
        ctx.textBaseline = 'top';
        let y = 20;
        const x = 40;

        // Draw text overlay
        ctx.fillText(`${panel.scene} - ${panel.shot}`, x, y);
        y += 40;
        this.wrapText(ctx, `DIALOG: ${panel.dialogue || 'N/A'}`, x, y, canvas.width - 80, 35);
        y += 40;
        this.wrapText(ctx, `DESC: ${panel.description || 'N/A'}`, x, y, canvas.width - 80, 35);
        y += 40;
        this.wrapText(ctx, `DIR: ${panel.direction || 'N/A'}`, x, y, canvas.width - 80, 35);
        y += 40;
        this.wrapText(ctx, `CAM: ${panel.camera || 'N/A'}`, x, y, canvas.width - 80, 35);

        return canvas;
    }

    wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let line = '';
        let currentY = y;
        
        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;
            
            if (testWidth > maxWidth && n > 0) {
                ctx.fillText(line, x, currentY);
                line = words[n] + ' ';
                currentY += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, x, currentY);
        return currentY + lineHeight;
    }
}

// Initialize the application when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.storyboard = new StoryboardFormatter();
    });
} else {
    window.storyboard = new StoryboardFormatter();
}
