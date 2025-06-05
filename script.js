class StoryboardFormatter {
    constructor() {
        this.panels = [];
        this.currentPanelIndex = -1;
        this.clipboardData = null;
        this.projectName = 'Untitled Project';
        this.autoSaveInterval = null;
        this.hasUnsavedChanges = false;
        this.autoSaveData = null;
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
            if (e.target.files[0]) {
                this.loadProject(e.target.files[0]);
            }
            e.target.value = '';
        });

        // Import button
        document.getElementById('import-btn').addEventListener('click', () => {
            document.getElementById('file-input').click();
        });

        // File input
        document.getElementById('file-input').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileImport(e.target.files);
            }
            e.target.value = '';
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
            document.getElementById(id).addEventListener('input', () => {
                this.updateCurrentPanel();
                this.markUnsaved();
            });
        });
    }

    setupDragDrop() {
        const container = document.getElementById('panels-container');
        
        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            container.classList.add('drag-over');
        });

        container.addEventListener('dragleave', () => {
            container.classList.remove('drag-over');
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
            alert('No valid image files found. Please select image files (JPG, PNG, GIF, etc.)');
            return;
        }

        this.showSaveIndicator('Processing images...', 'saving');
        
        for (const file of imageFiles) {
            try {
                const imageUrl = await this.fileToHighQualityDataURL(file);
                const panel = {
                    id: Date.now() + Math.random(),
                    image: imageUrl,
                    scene: `Scene ${this.panels.length + 1}`,
                    shot: `Panel ${this.panels.length + 1}`,
                    description: '',
                    dialogue: '',
                    direction: '',
                    camera: '',
                    duration: 5,
                    originalFileName: file.name
                };
                this.panels.push(panel);
            } catch (error) {
                console.error('Error processing image:', file.name, error);
                alert(`Error processing image: ${file.name}`);
            }
        }

        this.renderPanels();
        this.markUnsaved();
        this.showSaveIndicator(`Imported ${imageFiles.length} images`, 'saved');
    }

    fileToHighQualityDataURL(file, maxWidth = 4096, maxHeight = 4096, quality = 0.98) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            img.onload = () => {
                // Keep original dimensions or scale down only if necessary
                let { width, height } = img;
                
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width *= ratio;
                    height *= ratio;
                }
                
                // Set canvas size
                canvas.width = width;
                canvas.height = height;
                
                // Use highest quality rendering
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                
                // Draw the image
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convert to highest quality data URL
                const format = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
                const dataURL = canvas.toDataURL(format, quality);
                
                resolve(dataURL);
            };
            
            img.onerror = () => reject(new Error('Failed to load image'));
            
            const reader = new FileReader();
            reader.onload = (e) => {
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
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
                <img src="${panel.image}" alt="Panel ${index + 1}" class="panel-image" loading="lazy">
                <div class="panel-info">
                    <div><label>DESC:</label><span>${panel.description || 'No description'}</span></div>
                    <div><label>DIALOG:</label><span>${panel.dialogue || 'No dialogue'}</span></div>
                    <div><label>DIR:</label><span>${panel.direction || 'No direction'}</span></div>
                    <div><label>CAM:</label><span>${panel.camera || 'No camera notes'}</span></div>
                </div>
            </div>
        `).join('');
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
        editor.style.display = 'block';
    }

    closeEditor() {
        const editor = document.getElementById('panel-editor');
        editor.classList.remove('open');
        this.currentPanelIndex = -1;
        this.renderPanels();
    }

    populateEditor() {
        if (this.currentPanelIndex === -1) return;
        
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
        if (this.currentPanelIndex === -1) return;
        
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
        if (this.currentPanelIndex === -1) return;
        
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
        if (this.currentPanelIndex === -1 || !this.clipboardData) {
            this.showSaveIndicator('No data to paste!', 'error');
            return;
        }
        
        const panel = this.panels[this.currentPanelIndex];
        Object.assign(panel, this.clipboardData);
        
        this.populateEditor();
        this.renderPanels();
        this.markUnsaved();
        this.showSaveIndicator('Panel data pasted!', 'saved');
    }

    deletePanel() {
        if (this.currentPanelIndex === -1) return;
        
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
            
            if (this.currentPanelIndex === index) {
                this.closeEditor();
            } else if (this.currentPanelIndex > index) {
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
        this.showSaveIndicator('New project created', 'saved');
    }

    saveProject() {
        const projectData = {
            name: this.projectName,
            panels: this.panels,
            version: '1.0',
            created: new Date().toISOString(),
            lastModified: new Date().toISOString()
        };

        try {
            const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${this.projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
            link.click();
            URL.revokeObjectURL(link.href);

            this.hasUnsavedChanges = false;
            this.updateTitle();
            this.showSaveIndicator('Project saved!', 'saved');
        } catch (error) {
            console.error('Error saving project:', error);
            this.showSaveIndicator('Error saving project!', 'error');
        }
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
            console.error('Error loading project:', error);
            this.showSaveIndicator('Error loading project!', 'error');
            alert('Error loading project file: ' + error.message);
        }
    }

    // Auto-save functionality
    startAutoSave() {
        this.autoSaveInterval = setInterval(() => {
            this.autoSave();
        }, 30000);
    }

    autoSave() {
        if (this.panels.length === 0) return;

        const autoSaveData = {
            panels: this.panels,
            projectName: this.projectName,
            timestamp: new Date().toISOString()
        };

        try {
            this.autoSaveData = JSON.stringify(autoSaveData);
            this.showSaveIndicator('Auto-saved', 'saved');
        } catch (error) {
            console.warn('Auto-save failed:', error);
        }
    }

    loadAutoSave() {
        try {
            if (this.autoSaveData) {
                const autoSaveData = JSON.parse(this.autoSaveData);
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
        this.autoSaveData = null;
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
                
                pdf.rect(x, y, panelWidth, panelHeight);
                
                try {
                    pdf.addImage(panel.image, 'JPEG', x + 5, y + 5, panelWidth - 70, 60);
                } catch (e) {
                    console.warn('Could not add image to PDF');
                }
                
                pdf.setFontSize(8);
                pdf.text(`${panel.scene} - ${panel.shot}`, x + 5, y + 75);
                pdf.text(`DESC: ${panel.description}`, x + 5, y + 80, { maxWidth: panelWidth - 10 });
                pdf.text(`DIALOG: ${panel.dialogue}`, x + 5, y + 90, { maxWidth: panelWidth - 10 });
                pdf.text(`DIRECTION: ${panel.direction}`, x + 5, y + 100, { maxWidth: panelWidth - 10 });
            }
            
            currentPage++;
        }
        
        pdf.save('storyboard.pdf');
    }

    async exportSinglePanels() {
        if (this.panels.length === 0) {
            alert('No panels to export!');
            return;
        }

        this.showSaveIndicator('Exporting panels...', 'saving');

        for (let i = 0; i < this.panels.length; i++) {
            const canvas = await this.createStoryboardProCanvas(this.panels[i], i);
            const link = document.createElement('a');
            link.download = `panel_${String(i + 1).padStart(3, '0')}.png`;
            link.href = canvas.toDataURL('image/png', 1.0); // Maximum quality
            link.click();
            
            // Small delay to prevent browser blocking
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        this.showSaveIndicator('Panels exported!', 'saved');
    }

    async exportZIP() {
        if (this.panels.length === 0) {
            alert('No panels to export!');
            return;
        }

        this.showSaveIndicator('Creating ZIP...', 'saving');

        const zip = new JSZip();
        
        for (let i = 0; i < this.panels.length; i++) {
            const canvas = await this.createStoryboardProCanvas(this.panels[i], i);
            const dataUrl = canvas.toDataURL('image/png', 1.0);
            const base64Data = dataUrl.split(',')[1];
            zip.file(`panel_${String(i + 1).padStart(3, '0')}.png`, base64Data, { base64: true });
        }
        
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.download = 'storyboard_panels.zip';
        link.href = URL.createObjectURL(zipBlob);
        link.click();
        URL.revokeObjectURL(link.href);

        this.showSaveIndicator('ZIP exported!', 'saved');
    }

    async createStoryboardProCanvas(panel, index) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set to 1920x1080 HD resolution
        canvas.width = 1920;
        canvas.height = 1080;
        
        // Enable high-quality rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Load and draw the main image
        const img = new Image();
        await new Promise((resolve) => {
            img.onload = resolve;
            img.src = panel.image;
        });
        
        // Calculate image dimensions to fill the canvas while maintaining aspect ratio
        const imgAspect = img.width / img.height;
        const canvasAspect = canvas.width / canvas.height;
        
        let drawWidth, drawHeight, offsetX, offsetY;
        
        if (imgAspect > canvasAspect) {
            // Image is wider than canvas
            drawHeight = canvas.height;
            drawWidth = drawHeight * imgAspect;
            offsetX = (canvas.width - drawWidth) / 2;
            offsetY = 0;
        } else {
            // Image is taller than canvas
            drawWidth = canvas.width;
            drawHeight = drawWidth / imgAspect;
            offsetX = 0;
            offsetY = (canvas.height - drawHeight) / 2;
        }
        
        // Fill with black background first
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw the image
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
        
        // Create semi-transparent overlays for text areas
        const overlayAlpha = 0.8;
        
        // Top overlay for scene/panel info
        const topHeight = 120;
        ctx.fillStyle = `rgba(0, 0, 0, ${overlayAlpha})`;
        ctx.fillRect(0, 0, canvas.width, topHeight);
        
        // Bottom overlay for dialogue
        const bottomHeight = 200;
        if (panel.dialogue && panel.dialogue.trim()) {
            ctx.fillStyle = `rgba(0, 0, 0, ${overlayAlpha})`;
            ctx.fillRect(0, canvas.height - bottomHeight, canvas.width, bottomHeight);
        }
        
        // Text styling
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        // Scene and Panel info (top left)
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 48px "Arial", sans-serif';
        ctx.fillText(`${panel.scene} - ${panel.shot}`, 40, 25);
        
        // Duration and timecode (top right)
        const timestamp = this.formatTime(index * (panel.duration || 5));
        ctx.textAlign = 'right';
        ctx.font = 'bold 36px "Arial", sans-serif';
        ctx.fillText(`${panel.duration}s | ${timestamp}`, canvas.width - 40, 30);
        
        // Camera/Direction info (top, second line)
        ctx.textAlign = 'left';
        ctx.font = '32px "Arial", sans-serif';
        if (panel.camera) {
            ctx.fillText(`CAM: ${panel.camera}`, 40, 80);
        }
        
        // Dialogue (bottom, centered)
        if (panel.dialogue && panel.dialogue.trim()) {
            ctx.textAlign = 'center';
            ctx.font = 'bold 42px "Arial", sans-serif';
            const dialogueY = canvas.height - bottomHeight + 40;
            this.wrapText(ctx, panel.dialogue, canvas.width / 2, dialogueY, canvas.width - 80, 50);
        }
        
        // Description (bottom left corner, smaller)
        if (panel.description && panel.description.trim()) {
            ctx.textAlign = 'left';
            ctx.font = '24px "Arial", sans-serif';
            ctx.fillStyle = '#CCCCCC';
            ctx.fillText(`DESC: ${panel.description}`, 40, canvas.height - 40);
        }
        
        // Direction notes (bottom right corner, smaller)
        if (panel.direction && panel.direction.trim()) {
            ctx.textAlign = 'right';
            ctx.font = '24px "Arial", sans-serif';
            ctx.fillStyle = '#CCCCCC';
            ctx.fillText(`DIR: ${panel.direction}`, canvas.width - 40, canvas.height - 40);
        }
        
        return canvas;
    }

    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const frames = Math.floor((seconds % 1) * 24); // 24fps
        
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(frames).padStart(2, '0')}`;
    }

    wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let line = '';
        let currentY = y;
        const lines = [];
        
        // First, build all lines
        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;
            
            if (testWidth > maxWidth && n > 0) {
                lines.push(line.trim());
                line = words[n] + ' ';
            } else {
                line = testLine;
            }
        }
        lines.push(line.trim());
        
        // Draw all lines
        lines.forEach((line, index) => {
            if (line.trim()) {
                ctx.fillText(line, x, currentY + (index * lineHeight));
            }
        });
    }
}

// Initialize the application
const storyboard = new StoryboardFormatter();