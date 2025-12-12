

// ==========================================
    // 1. MODEL MATEMATYCZNY (BACKEND)
    // ==========================================
    const GLOBAL_RTP = 0.85;

    class GameNode {
        constructor(riskType) {
            this.riskType = riskType;
            if (this.riskType === 'LOW') {
                this.winChance = 0.60 + (0.90 - 0.60) * Math.random();
                this.lossPercent = 0.20 + (0.35 - 0.20) * Math.random();
            } else if (this.riskType === 'HIGH') {
                this.winChance = 0.20 + (0.50 - 0.20) * Math.random();
                this.lossPercent = 0.50 + (0.80 - 0.50) * Math.random();
            } else { 
                this.winChance = 0.50;
                this.lossPercent = 1.0;
            }
            let safeWinChance = Math.max(this.winChance, 0.01);
            this.gainPercent = ((1.0 - this.winChance) * this.lossPercent) / safeWinChance * GLOBAL_RTP;
        }

        getTargetRollD100() {
            if (this.riskType === 'BOSS') return 51;
            let winningOutcomes = Math.round(this.winChance * 100.0);
            if (winningOutcomes < 1) winningOutcomes = 1;
            if (winningOutcomes > 99) winningOutcomes = 99;
            return 101 - winningOutcomes;
        }
    }

    const ScoreManager = {
        saveScore: function(name, score) {
            let scores = JSON.parse(localStorage.getItem('lottoScores')) || [];
            scores.push({name: name, score: score});
            scores.sort((a, b) => b.score - a.score);
            scores = scores.slice(0, 10);
            localStorage.setItem('lottoScores', JSON.stringify(scores));
        },
        getScores: function() {
            return JSON.parse(localStorage.getItem('lottoScores')) || [];
        }
    };

    // ==========================================
    // 2. KOMUNIKACJA HTML <-> PHASER
    // ==========================================
    
    // Zmienna globalna trzymająca aktywną scenę Menu
    var currentMenuScene = null;

    function openOverlay() {
        document.getElementById('overlay').style.display = 'flex';
        // !!! KLUCZOWE !!! WYŁĄCZAMY OBSŁUGĘ KLIKNIĘĆ W GRZE
        if (currentMenuScene) {
            currentMenuScene.input.enabled = false;
            currentMenuScene.input.stopPropagation(); // Zatrzymaj wszystko
        }
    }

    function closeOverlay() {
        document.getElementById('overlay').style.display = 'none';
        // WŁĄCZAMY Z POWROTEM
        if (currentMenuScene) {
            // Małe opóźnienie, żeby kliknięcie "Anuluj" nie odpaliło przycisku pod spodem
            setTimeout(() => {
                if (currentMenuScene) currentMenuScene.input.enabled = true;
            }, 100);
        }
    }
    window.closeOverlay = closeOverlay;

    window.startGameFromInput = function() {
        let name = document.getElementById('playerName').value || "Anonim";
        document.getElementById('overlay').style.display = 'none';
        
        if (currentMenuScene) {
            currentMenuScene.input.enabled = true; // Musimy włączyć, żeby scena mogła się zmienić
            currentMenuScene.scene.start('GameScene', { playerName: name });
            // currentMenuScene.scene.stop('MenuScene'); // Opcjonalne
        }
    }

    // ==========================================
    // 3. SCENY PHASER
    // ==========================================

    class PreloadScene extends Phaser.Scene {
        constructor() { super('PreloadScene'); }
        preload() {
            this.load.image('background', 'assets/mapa.png'); 
            this.load.image('low', 'assets/low.png');
            this.load.image('high', 'assets/high.png');
            this.load.image('boss', 'assets/boss.png');
            this.load.image('fire', 'assets/ognisko.png');
            this.load.spritesheet('lottek', 'assets/lottek.png', {frameWidth: 140, frameHeight: 120});
        }
        create() { this.scene.start('MenuScene'); }
    }

    class MenuScene extends Phaser.Scene {
        constructor() { super('MenuScene'); }
        create() {
            // Zapisz referencję do tej sceny, żeby HTML mógł ją zablokować
            currentMenuScene = this; 
            this.input.enabled = true; // Upewnij się, że jest włączone na starcie

            this.add.image(500, 325, 'background').setTint(0x444444);
            
            this.add.text(505, 105, 'LOTTO QUEST', { fontSize: '64px', fill: '#000', fontStyle: 'bold' }).setOrigin(0.5);
            this.add.text(500, 100, 'LOTTO QUEST', { fontSize: '64px', fill: '#ffd700', stroke: '#000', strokeThickness: 6, fontStyle: 'bold' }).setOrigin(0.5);

            // Przyciski
            this.createButton(500, 275, 'GRAJ', () => openOverlay(), '#ffffff');
            this.createButton(500, 375, 'ZASADY', () => this.scene.start('RulesScene'), '#ffffff');
            this.createButton(500, 475, 'RANKING', () => this.scene.start('LeaderboardScene'), '#ffffff');
        }

        createButton(x, y, text, callback, color) {
            let btn = this.add.text(x, y, text, { 
                fontSize: '36px', 
                fill: color, 
                backgroundColor: '#111', 
                padding: {x:30, y:15},
                stroke: '#000',
                strokeThickness: 4
            })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => { btn.setScale(1.1); btn.setBackgroundColor('#333'); })
            .on('pointerout', () => { btn.setScale(1.0); btn.setBackgroundColor('#111'); })
            .on('pointerdown', () => {
                // Dodatkowe zabezpieczenie: nie reaguj, jeśli input wyłączony
                if (this.input.enabled) callback();
            });
        }
    }

    class RulesScene extends Phaser.Scene {
        constructor() { super('RulesScene'); }
        create() {
            this.add.image(500, 325, 'background').setTint(0x222222);
            this.add.text(500, 80, 'ZASADY GRY', { fontSize: '48px', fill: '#ffd700', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);
            
            let rules = [
                "1. Twoje 'wpisowe' to 100 PKT które możesz pomnożyć wygrywając",
                "walkę z potworem lub w przeciwnym przypadku stracić",
                "2. Wchodząc na terytorium potwora musisz wykonać rzut Kością 'D100'",
                "jeżeli twój los jest większy niż numer potwora wygrałeś",
                "w przeciwnym przypadku przegrywasz i tracisz jedno z trzech żyć",
                "3. Posiadasz 3 życia, utrata wszystkich równa się z konciem Gry.",
                "4. Boss (Lv 10) rzuca monetą: podwojenie (x2) lub połowa (x0.5).",
                "",
                "Sterowanie: strzałki - lewo | góra | prawo"
            ];
            
            this.add.text(500, 320, rules, { fontSize: '24px', fill: '#fff', align: 'center', stroke:'#000', strokeThickness:3, lineSpacing: 10 }).setOrigin(0.5);
            
            this.add.text(500, 580, 'POWRÓT', { fontSize: '32px', fill: '#ffd700', backgroundColor: '#333', padding:{x:20,y:10} })
                .setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.scene.start('MenuScene'));
        }
    }

    class LeaderboardScene extends Phaser.Scene {
        constructor() { super('LeaderboardScene'); }
        create() {
            this.add.image(500, 325, 'background').setTint(0x222222);
            this.add.text(500, 80, 'TOP 10 GRACZY', { fontSize: '48px', fill: '#ffd700', stroke:'#000', strokeThickness:4 }).setOrigin(0.5);
            
            let bg = this.add.graphics();
            bg.fillStyle(0x000000, 0.6);
            bg.fillRect(200, 130, 600, 400);

            let scores = ScoreManager.getScores();
            let startY = 160;
            if (scores.length === 0) {
                this.add.text(500, 300, 'Brak wyników. Bądź pierwszy!', { fontSize: '24px', fill: '#aaa' }).setOrigin(0.5);
            } else {
                scores.forEach((entry, index) => {
                    let col = index === 0 ? '#ffd700' : (index === 1 ? '#c0c0c0' : (index === 2 ? '#cd7f32' : '#fff'));
                    this.add.text(250, startY + (index * 38), `${index+1}. ${entry.name}`, { fontSize: '26px', fill: col, stroke:'#000', strokeThickness:2 });
                    this.add.text(750, startY + (index * 38), `${entry.score.toFixed(1)} PKT`, { fontSize: '26px', fill: col, stroke:'#000', strokeThickness:2 }).setOrigin(1, 0);
                });
            }
            this.add.text(500, 580, 'POWRÓT', { fontSize: '32px', fill: '#fff', backgroundColor: '#333', padding:{x:20,y:10} })
                .setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.scene.start('MenuScene'));
        }
    }

    class GameScene extends Phaser.Scene {
        constructor() { super('GameScene'); }

        init(data) {
            this.playerName = data.playerName || "Anonim";
            this.level = 1;
            this.sessionPoints = 100.0;
            this.hp = 3;
            this.isGameOver = false;
            this.canMove = true;
            this.playerStartY = 500;
            this.rowSpacing = 300;
            
            this.column = new Array(9);
            this.column[8] = 1;
            this.levelNodes = [];
            
            let lastNum = 1;
            for (var i = 0; i < 8; i++) {
                let x = 0;
                while (true) { x = Math.floor((Math.random() * 3) + 1); if (x != lastNum) break; }
                this.column[i] = x; lastNum = x;
            }
        }

        create() {
            this.add.image(500, 675, 'background');
            this.cameras.main.setBounds(0, -2500, 1000, 3050);
            this.cameras.main.centerOn(500, ((this.playerStartY/2)+100));

            this.createMap();
            this.player = this.physics.add.sprite(570, this.playerStartY - 40, 'lottek');
            
            let uiBg = this.add.graphics().setScrollFactor(0);
            uiBg.fillStyle(0x000000, 0.85);
            uiBg.fillRect(0, 0, 1000, 70);
            uiBg.lineStyle(2, 0x444444);
            uiBg.lineBetween(0, 70, 1000, 70);

            this.scoreText = this.add.text(20, 15, 'PKT: 100.0', { fontSize: '32px', fill: '#ffd700', stroke: '#000', strokeThickness: 4 }).setScrollFactor(0);
            this.hpText = this.add.text(450, 15, '❤️ 3', { fontSize: '32px', fill: '#ff4444', stroke: '#000', strokeThickness: 4 }).setScrollFactor(0);
            this.levelText = this.add.text(775, 15, 'POZIOM: 1/10', { fontSize: '28px', fill: '#fff', stroke: '#000', strokeThickness: 4 }).setScrollFactor(0);

            this.cursors = this.input.keyboard.createCursorKeys();
        }

        // --- FLOATING TEXT (POPRAWIONY) ---
        showFloatingText(line1, line2, color) {
            let container = this.add.container(500, this.player.y - 150);
            
            // Tło pod tekst
            let bg = this.add.graphics();
            bg.fillStyle(0x000000, 0.8);
            bg.fillRoundedRect(-350, -70, 700, 140, 20);
            bg.lineStyle(4, 0xffd700);
            bg.strokeRoundedRect(-350, -70, 700, 140, 20);
            container.add(bg);

            // Tekst główny
            let t1 = this.add.text(0, -25, line1, { 
                fontSize: '48px', fill: color, stroke: '#000', strokeThickness: 6, fontStyle: 'bold' 
            }).setOrigin(0.5);
            
            // Tekst podrzędny
            let t2 = this.add.text(0, 35, line2, { 
                fontSize: '26px', fill: '#ffffff', stroke: '#000', strokeThickness: 3 
            }).setOrigin(0.5);

            container.add([t1, t2]);
            container.setScale(0); 

            // Animacja POP
            this.tweens.add({
                targets: container,
                scaleX: 1, scaleY: 1,
                duration: 300,
                ease: 'Back.out'
            });

            // Animacja FLOAT
            this.tweens.add({
                targets: container,
                y: container.y - 120, 
                alpha: 0,
                duration: 1200,
                delay: 1800, 
                onComplete: () => { container.destroy(); }
            });
        }
        oneLoss(line1, line2, color) {
            let container = this.add.container(500, this.player.y - 150);
            
            // Tło pod tekst
            let bg = this.add.graphics();
            bg.fillStyle(0x000000, 0.8);
            bg.fillRoundedRect(-350, -70, 700, 140, 20);
            bg.lineStyle(4, 0xffd700);
            bg.strokeRoundedRect(-350, -70, 700, 140, 20);
            container.add(bg);

            // Tekst główny
            let t1 = this.add.text(0, -25, line1, { 
                fontSize: '48px', fill: color, stroke: '#000', strokeThickness: 6, fontStyle: 'bold' 
            }).setOrigin(0.5);
            
            // Tekst podrzędny
            let t2 = this.add.text(0, 35, line2, { 
                fontSize: '26px', fill: '#ffffff', stroke: '#000', strokeThickness: 3 
            }).setOrigin(0.5);

            container.add([t1, t2]);
            container.setScale(0); 

            // Animacja POP
            this.tweens.add({
                targets: container,
                scaleX: 1, scaleY: 1,
                duration: 300,
                ease: 'Back.out'
            });
        }

        resolveTurn(nodeIndex) {
            let node = this.levelNodes[this.level - 1][nodeIndex];
            let target = node.getTargetRollD100();
            let roll = Math.floor(Math.random() * 100) + 1;
            let isWin = false;
            
            if (node.riskType === 'BOSS') {
                isWin = (roll >= 51);
                if (isWin) {
                    this.sessionPoints *= 2.0;
                    this.showFloatingText("WIELKA WYGRANA!", `Boss pokonany! Rzut: ${roll} (51+)`, "#00ff00");
                } else {
                    this.sessionPoints *= 0.50;
                    this.showFloatingText("PORAŻKA...", `Boss wygrał. Rzut: ${roll} (51+)`, "#ff0000");
                }
                this.endGame(true);
            } else {
                isWin = (Math.random() <= node.winChance);
                
                let visualRoll = isWin ? 
                    Math.floor(Math.random() * (100 - target + 1)) + target : 
                    Math.floor(Math.random() * Math.max(1, target - 1)) + 1;

                if (!isWin && Math.random() < 0.20 && target > 1) visualRoll = target - 1;

                if (isWin) {
                    let gain = this.sessionPoints * node.gainPercent;
                    this.sessionPoints += gain;
                    this.showFloatingText("SUKCES!", `Cel:${target}+ | Twój los:${visualRoll} | +${gain.toFixed(1)} PKT`, "#00ff00");
                } else {
                    let loss = this.sessionPoints * node.lossPercent;
                    this.sessionPoints -= loss;
                    this.hp--;
                    
                    if (visualRoll >= target - 2) {
                        this.showFloatingText("O MAŁY WŁOS!", `Cel:${target}+ | Twój los:${visualRoll} | -${loss.toFixed(1)} PKT`, "#ffa500");
                    } else {
                        this.showFloatingText("PUDŁO...", `Cel:${target}+ | Twój los:${visualRoll} | -${loss.toFixed(1)} PKT`, "#ff0000");
                    }
                }
            }

            this.scoreText.setText(`PKT: ${this.sessionPoints.toFixed(1)}`);
            this.hpText.setText(`❤️ ${this.hp}`);

            if (this.hp <= 0 || this.sessionPoints <= 0.1) {
                this.endGame(false);
            } else if (!this.isGameOver) {
                this.level++;
                this.levelText.setText(`POZIOM: ${this.level}/10`);
                this.time.delayedCall(1500, () => { this.canMove = true; });
            }
        }

        createMap() {
            var currX, currY, nextX, nextY, currRowSize, nextRowSize, currColumnSpacing, nextColumnSpacing;
            for (var i = 0; i <= 8; i++) {
                nextRowSize = this.column[i];
                currRowSize = (i===0) ? 1 : this.column[i-1];
                currColumnSpacing = 1000 / (currRowSize + 1);
                nextColumnSpacing = 1000 / (nextRowSize + 1);
                for (var j = 0; j < currRowSize; j++) {
                    currX = currColumnSpacing + (j*currColumnSpacing);
                    currY = this.playerStartY - (i * this.rowSpacing);
                    for (var k = 0; k < nextRowSize; k++) {
                        nextX = nextColumnSpacing + (k*nextColumnSpacing);
                        nextY = this.playerStartY - ((i+1) * this.rowSpacing);
                        let g = this.add.graphics();
                        g.lineStyle(4, 0x000000, 1);
                        this.drawDashedLine(g, currX, currY, nextX, nextY);
                    }
                }
            }
            this.add.image(500, this.playerStartY, 'fire');

            for (var j = 0; j <= 8; j++) {
                this.levelNodes[j] = [];
                for (var i = 0; i < this.column[j]; i++) {
                    let colCount = this.column[j];
                    let spacing = 1000 / (colCount + 1);
                    let posX = spacing + (i * spacing);
                    let posY = this.playerStartY - (this.rowSpacing * (j + 1));
                    
                    let risk = 'LOW';
                    if (j == 8) {
                        risk = 'BOSS';
                        this.add.image(posX, posY, 'boss');
                    } else {
                        let chooseDiff = Math.floor((Math.random() * 2) + 1);
                        if (chooseDiff == 1) { risk = 'LOW'; this.add.image(posX, posY, 'low'); }
                        else { risk = 'HIGH'; this.add.image(posX, posY, 'high'); }
                    }
                    
                    let node = new GameNode(risk);
                    this.levelNodes[j].push(node);
                    let target = node.getTargetRollD100();
                    let infoText = (risk === 'BOSS') ? "51+" : `${target}+`;
                    
                    let txtBg = this.add.graphics();
                    txtBg.fillStyle(0x000000, 0.7);
                    txtBg.fillRoundedRect(posX - 30, posY - 90, 57.5, 30, 5);
                    this.add.text(posX, posY - 75, `D${infoText}`, { fontSize: '15px', fill: '#fff', fontStyle:'bold' }).setOrigin(0.5);
                }
            }
        }

        drawDashedLine(graphics, x1, y1, x2, y2) {
            const dx = x2 - x1; const dy = y2 - y1;
            const length = Math.sqrt(dx*dx + dy*dy);
            const steps = Math.floor(length / 20);
            const vx = dx / length; const vy = dy / length;
            let startX = x1; let startY = y1;
            for (let i = 0; i < steps; i++) {
                let endX = startX + vx * 10; let endY = startY + vy * 10;
                graphics.beginPath(); graphics.moveTo(startX, startY); graphics.lineTo(endX, endY);
                graphics.strokePath();
                startX += vx * 20; startY += vy * 20;
            }
        }

        update() {
            if (this.isGameOver || !this.canMove || this.level > 9) return;
            let currentRowCount = this.column[this.level - 1];
            let colSpace = 0; let pos1 = 0, pos2 = 0, pos3 = 0;
            if (currentRowCount == 1) { colSpace = 500; pos2 = 500; }
            else if (currentRowCount == 2) { colSpace = 1000/3; pos1 = colSpace; pos3 = 2*colSpace; }
            else if (currentRowCount == 3) { colSpace = 1000/4; pos1 = colSpace; pos2 = 2*colSpace; pos3 = 3*colSpace; }

            if (Phaser.Input.Keyboard.JustDown(this.cursors.left) && pos1 != 0) this.movePlayer(pos1, 0);
            else if (Phaser.Input.Keyboard.JustDown(this.cursors.up) && pos2 != 0) {
                let index = (currentRowCount === 3) ? 1 : 0;
                this.movePlayer(pos2, index);
            } else if (Phaser.Input.Keyboard.JustDown(this.cursors.right) && pos3 != 0) {
                let index = (currentRowCount === 2) ? 1 : 2;
                this.movePlayer(pos3, index);
            }
        }

        movePlayer(targetX, nodeIndex) {
            this.canMove = false;
            let targetY = this.playerStartY - (this.level * this.rowSpacing);
            this.cameras.main.startFollow(this.player, true, 1, 1);
            this.cameras.main.setFollowOffset(0, 200);
            this.tweens.add({
                targets: this.player, 
                x: targetX + 80, 
                y: targetY, 
                duration: 1000, 
                ease: 'Power2',
                onComplete: () => { this.resolveTurn(nodeIndex); }
            });
        }

        endGame(success) {
            this.isGameOver = true;
            this.canMove = false;
            let msg = success ? "ZWYCIĘSTWO!" : "KONIEC GRY";
            let color = success ? "#00ff00" : "#ff0000";
            if (!success) this.sessionPoints = 0;
            
            let endText = this.add.text(500, this.player.y, msg, { fontSize: '64px', fill: color, stroke: '#000', strokeThickness: 8 }).setOrigin(0.5).setAlpha(0);
            this.tweens.add({ targets: endText, alpha: 1, scale: 1.2, duration: 500, yoyo: true, repeat: 1 });

            if (this.sessionPoints > 0) ScoreManager.saveScore(this.playerName, this.sessionPoints);
            this.time.delayedCall(3000, () => { this.scene.start('LeaderboardScene'); });
        }
    }

    var config = {
        type: Phaser.AUTO,
        width: 1000,
        height: 650,
        parent: 'game-container',
        physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
        dom: { createContainer: true },
        scene: [PreloadScene, MenuScene, RulesScene, LeaderboardScene, GameScene]
    };

    var game = new Phaser.Game(config);