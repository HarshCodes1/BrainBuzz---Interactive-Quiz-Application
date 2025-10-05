

class QuizApp {
    constructor() {
        this.currentMode = '';
        this.selectedCategory = '';
        this.difficulty = 'medium';
        this.questionCount = 10;
        this.questions = [];
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.userAnswers = [];
        this.timer = null;
        this.timeLeft = 0;
        this.totalQuizTime = 0;
        this.quizStartTime = 0;
        
        // DOM elements
        this.landingScreen = document.getElementById('landingScreen');
        this.categoryScreen = document.getElementById('categoryScreen');
        this.quizScreen = document.getElementById('quizScreen');
        this.resultsScreen = document.getElementById('resultsScreen');
        this.reviewScreen = document.getElementById('reviewScreen');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.showScreen('landing');
    }
    
    bindEvents() {
        // Mode selection
        document.querySelectorAll('.mode-card').forEach(card => {
            card.addEventListener('click', (e) => this.selectMode(e.currentTarget.dataset.mode));
        });
        
        // Category selection
        document.querySelectorAll('.category-card').forEach(card => {
            card.addEventListener('click', (e) => this.selectCategory(e.currentTarget.dataset.category));
        });
        
        // Settings
        document.getElementById('difficulty').addEventListener('change', (e) => {
            this.difficulty = e.target.value;
        });
        
        document.getElementById('questionCount').addEventListener('change', (e) => {
            this.questionCount = parseInt(e.target.value);
        });
        
        // Navigation
        document.getElementById('backToLanding').addEventListener('click', () => this.showScreen('landing'));
        document.getElementById('backToResults').addEventListener('click', () => this.showScreen('results'));
        
        // Quiz controls
        document.getElementById('startQuizBtn').addEventListener('click', () => this.startQuiz());
        document.getElementById('nextQuestionBtn').addEventListener('click', () => this.nextQuestion());
        document.getElementById('skipQuestionBtn').addEventListener('click', () => this.skipQuestion());
        
        // Answer selection
        document.getElementById('answersGrid').addEventListener('click', (e) => {
            if (e.target.classList.contains('answer-btn')) {
                this.selectAnswer(parseInt(e.target.dataset.answer));
            }
        });
        
        // Results actions
        document.getElementById('playAgainBtn').addEventListener('click', () => this.resetQuiz());
        document.getElementById('reviewAnswersBtn').addEventListener('click', () => this.showReview());
        document.getElementById('shareResultsBtn').addEventListener('click', () => this.shareResults());
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }
    
    selectMode(mode) {
        this.currentMode = mode;
        document.getElementById('selectedModeDisplay').textContent = `${mode.charAt(0).toUpperCase() + mode.slice(1)} Mode`;
        
        // Add visual feedback
        document.querySelectorAll('.mode-card').forEach(card => {
            card.style.transform = 'scale(0.95)';
            setTimeout(() => {
                card.style.transform = '';
            }, 150);
        });
        
        setTimeout(() => this.showScreen('category'), 300);
    }
    
    selectCategory(categoryId) {
        this.selectedCategory = categoryId;
        
        // Update UI
        document.querySelectorAll('.category-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        document.querySelector(`[data-category="${categoryId}"]`).classList.add('selected');
        document.getElementById('startQuizBtn').disabled = false;
    }
    
    async startQuiz() {
        this.showLoading(true);
        
        try {
            await this.fetchQuestions();
            this.quizStartTime = Date.now();
            this.currentQuestionIndex = 0;
            this.score = 0;
            this.userAnswers = [];
            
            this.showScreen('quiz');
            this.displayQuestion();
            this.startTimer();
            
        } catch (error) {
            console.error('Error starting quiz:', error);
            alert('Failed to load questions. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }
    
    async fetchQuestions() {
        const apiUrl = 'https://opentdb.com/api.php';
        const params = new URLSearchParams({
            amount: this.questionCount,
            category: this.selectedCategory,
            difficulty: this.difficulty,
            type: 'multiple'
        });
        
        const response = await fetch(`${apiUrl}?${params}`);
        const data = await response.json();
        
        if (data.response_code !== 0) {
            throw new Error('Failed to fetch questions');
        }
        
        this.questions = data.results.map(q => ({
            question: this.decodeHTML(q.question),
            correct_answer: this.decodeHTML(q.correct_answer),
            incorrect_answers: q.incorrect_answers.map(a => this.decodeHTML(a)),
            all_answers: this.shuffleArray([
                this.decodeHTML(q.correct_answer),
                ...q.incorrect_answers.map(a => this.decodeHTML(a))
            ])
        }));
        
        // Set correct answer indices
        this.questions.forEach(q => {
            q.correct_index = q.all_answers.indexOf(q.correct_answer);
        });
    }
    
    decodeHTML(html) {
        const txt = document.createElement('textarea');
        txt.innerHTML = html;
        return txt.value;
    }
    
    shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }
    
    displayQuestion() {
        const question = this.questions[this.currentQuestionIndex];
        
        // Update progress
        const progressPercent = ((this.currentQuestionIndex + 1) / this.questions.length) * 100;
        document.getElementById('progressFill').style.width = `${progressPercent}%`;
        document.getElementById('progressText').textContent = 
            `${this.currentQuestionIndex + 1} of ${this.questions.length}`;
        
        // Update score
        document.getElementById('currentScore').textContent = this.score;
        
        // Display question
        document.getElementById('questionText').textContent = question.question;
        
        // Display answers
        const answersGrid = document.getElementById('answersGrid');
        const answerButtons = answersGrid.querySelectorAll('.answer-btn');
        
        answerButtons.forEach((btn, index) => {
            btn.textContent = question.all_answers[index];
            btn.className = 'answer-btn';
            btn.disabled = false;
            btn.dataset.answer = index;
        });
        
        // Hide/show controls
        document.getElementById('nextQuestionBtn').style.display = 'none';
        document.getElementById('skipQuestionBtn').style.display = 
            this.currentMode === 'practice' ? 'inline-block' : 'none';
        
        // Add animation
        document.querySelector('.question-card').style.opacity = '0';
        document.querySelector('.question-card').style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            document.querySelector('.question-card').style.opacity = '1';
            document.querySelector('.question-card').style.transform = 'translateY(0)';
        }, 100);
    }
    
    startTimer() {
        if (this.currentMode === 'practice') return;
        
        // Set timer based on mode
        if (this.currentMode === 'timed') {
            this.timeLeft = 15; // 15 seconds per question
        } else if (this.currentMode === 'exam') {
            if (this.currentQuestionIndex === 0) {
                this.timeLeft = this.questions.length * 30; // 30 seconds per question total
            }
        }
        
        this.updateTimerDisplay();
        
        this.timer = setInterval(() => {
            this.timeLeft--;
            this.updateTimerDisplay();
            
            if (this.timeLeft <= 0) {
                this.timeUp();
            }
        }, 1000);
    }
    
    updateTimerDisplay() {
        const timerDisplay = document.getElementById('timeLeft');
        const timerCircle = document.querySelector('.timer-circle');
        
        timerDisplay.textContent = this.timeLeft;
        
        // Change colors based on time left
        if (this.currentMode === 'timed') {
            if (this.timeLeft > 10) {
                timerCircle.className = 'timer-circle';
            } else if (this.timeLeft > 5) {
                timerCircle.className = 'timer-circle warning';
            } else {
                timerCircle.className = 'timer-circle danger';
            }
        } else if (this.currentMode === 'exam') {
            const totalTime = this.questions.length * 30;
            const timePercent = (this.timeLeft / totalTime) * 100;
            
            if (timePercent > 50) {
                timerCircle.className = 'timer-circle';
            } else if (timePercent > 25) {
                timerCircle.className = 'timer-circle warning';
            } else {
                timerCircle.className = 'timer-circle danger';
            }
        }
    }
    
    selectAnswer(answerIndex) {
        if (this.timer && this.currentMode !== 'exam') {
            clearInterval(this.timer);
        }
        
        const question = this.questions[this.currentQuestionIndex];
        const isCorrect = answerIndex === question.correct_index;
        const answerButtons = document.querySelectorAll('.answer-btn');
        
        // Disable all buttons
        answerButtons.forEach(btn => btn.disabled = true);
        
        // Show correct/incorrect feedback
        answerButtons[answerIndex].classList.add(isCorrect ? 'correct' : 'incorrect');
        answerButtons[question.correct_index].classList.add('correct');
        
        // Play sound effect
        this.playSound(isCorrect ? 'correct' : 'incorrect');
        
        // Update score and save answer
        if (isCorrect) {
            this.score++;
            this.animateScore();
        }
        
        this.userAnswers.push({
            questionIndex: this.currentQuestionIndex,
            selectedAnswer: answerIndex,
            correct: isCorrect,
            skipped: false
        });
        
        // Show next button or finish quiz
        if (this.currentQuestionIndex < this.questions.length - 1) {
            document.getElementById('nextQuestionBtn').style.display = 'inline-block';
            document.getElementById('skipQuestionBtn').style.display = 'none';
        } else {
            setTimeout(() => this.finishQuiz(), 1500);
        }
    }
    
    skipQuestion() {
        if (this.timer && this.currentMode !== 'exam') {
            clearInterval(this.timer);
        }
        
        this.userAnswers.push({
            questionIndex: this.currentQuestionIndex,
            selectedAnswer: -1,
            correct: false,
            skipped: true
        });
        
        if (this.currentQuestionIndex < this.questions.length - 1) {
            this.nextQuestion();
        } else {
            this.finishQuiz();
        }
    }
    
    nextQuestion() {
        this.currentQuestionIndex++;
        
        if (this.currentQuestionIndex < this.questions.length) {
            this.displayQuestion();
            if (this.currentMode === 'timed') {
                this.startTimer();
            }
        } else {
            this.finishQuiz();
        }
    }
    
    timeUp() {
        clearInterval(this.timer);
        
        if (this.currentMode === 'timed') {
            // Auto-skip question
            this.skipQuestion();
        } else if (this.currentMode === 'exam') {
            // End entire quiz
            this.finishQuiz();
        }
    }
    
    finishQuiz() {
        if (this.timer) {
            clearInterval(this.timer);
        }
        
        this.totalQuizTime = Math.round((Date.now() - this.quizStartTime) / 1000);
        this.showResults();
        
        // Trigger confetti for good scores
        const percentage = (this.score / this.questions.length) * 100;
        if (percentage >= 70) {
            this.createConfetti();
        }
    }
    
    showResults() {
        const correctAnswers = this.userAnswers.filter(a => a.correct).length;
        const incorrectAnswers = this.userAnswers.filter(a => !a.correct && !a.skipped).length;
        const skippedAnswers = this.userAnswers.filter(a => a.skipped).length;
        const percentage = Math.round((correctAnswers / this.questions.length) * 100);
        
        // Animate score counting
        this.animateCounter('finalPercentage', 0, percentage, '%');
        document.getElementById('finalScore').textContent = `${correctAnswers}/${this.questions.length}`;
        
        // Set grade
        const grade = this.calculateGrade(percentage);
        document.getElementById('gradeBadge').textContent = grade;
        document.getElementById('gradeBadge').className = `grade-badge ${grade.toLowerCase().replace('+', '-plus')}`;
        
        // Update stats
        this.animateCounter('correctAnswers', 0, correctAnswers);
        this.animateCounter('incorrectAnswers', 0, incorrectAnswers);
        this.animateCounter('skippedAnswers', 0, skippedAnswers);
        document.getElementById('totalTime').textContent = `${this.totalQuizTime}s`;
        
        this.showScreen('results');
    }
    
    calculateGrade(percentage) {
        if (percentage >= 95) return 'A+';
        if (percentage >= 90) return 'A';
        if (percentage >= 85) return 'A-';
        if (percentage >= 80) return 'B+';
        if (percentage >= 75) return 'B';
        if (percentage >= 70) return 'B-';
        if (percentage >= 65) return 'C+';
        if (percentage >= 60) return 'C';
        if (percentage >= 55) return 'C-';
        if (percentage >= 50) return 'D';
        return 'F';
    }
    
    animateCounter(elementId, start, end, suffix = '') {
        const element = document.getElementById(elementId);
        const duration = 1000;
        const stepTime = 50;
        const steps = duration / stepTime;
        const increment = (end - start) / steps;
        let current = start;
        
        const timer = setInterval(() => {
            current += increment;
            if (current >= end) {
                current = end;
                clearInterval(timer);
            }
            element.textContent = Math.round(current) + suffix;
        }, stepTime);
    }
    
    animateScore() {
        const scoreElement = document.getElementById('currentScore');
        scoreElement.style.transform = 'scale(1.2)';
        scoreElement.style.color = 'var(--success-color)';
        
        setTimeout(() => {
            scoreElement.style.transform = 'scale(1)';
            scoreElement.style.color = 'var(--primary-color)';
        }, 300);
    }
    
    showReview() {
        const reviewContent = document.getElementById('reviewContent');
        reviewContent.innerHTML = '';
        
        this.questions.forEach((question, index) => {
            const userAnswer = this.userAnswers.find(a => a.questionIndex === index);
            
            const reviewItem = document.createElement('div');
            reviewItem.className = 'review-item';
            
            const status = userAnswer.skipped ? 'skipped' : (userAnswer.correct ? 'correct' : 'incorrect');
            const statusText = userAnswer.skipped ? 'Skipped' : (userAnswer.correct ? 'Correct' : 'Incorrect');
            
            reviewItem.innerHTML = `
                <div class="review-question">${index + 1}. ${question.question}</div>
                <div class="review-answers">
                    ${question.all_answers.map((answer, ansIndex) => {
                        let className = 'neutral';
                        if (ansIndex === question.correct_index) {
                            className = 'correct';
                        } else if (ansIndex === userAnswer.selectedAnswer && !userAnswer.correct) {
                            className = 'user-incorrect';
                        }
                        return `<div class="review-answer ${className}">${answer}</div>`;
                    }).join('')}
                </div>
                <div class="review-status ${status}">Status: ${statusText}</div>
            `;
            
            reviewContent.appendChild(reviewItem);
        });
        
        this.showScreen('review');
    }
    
    shareResults() {
        const percentage = Math.round((this.score / this.questions.length) * 100);
        const grade = this.calculateGrade(percentage);
        
        const shareText = `🧠 BrainBuzz Results 🧠\n\n` +
            `Mode: ${this.currentMode.charAt(0).toUpperCase() + this.currentMode.slice(1)}\n` +
            `Score: ${this.score}/${this.questions.length} (${percentage}%)\n` +
            `Grade: ${grade}\n` +
            `Time: ${this.totalQuizTime}s\n\n` +
            `Think you can beat my score? Try BrainBuzz!`;
        
        if (navigator.share) {
            navigator.share({
                title: 'BrainBuzz Results',
                text: shareText
            }).catch(() => {
                // Fallback to clipboard if share fails
                navigator.clipboard.writeText(shareText).then(() => {
                    alert('Results copied to clipboard!');
                }).catch(() => {
                    alert('Unable to share results. Please copy manually.');
                });
            });
        } else {
            navigator.clipboard.writeText(shareText).then(() => {
                alert('Results copied to clipboard!');
            }).catch(() => {
                alert('Unable to copy to clipboard. Please copy manually.');
            });
        }
    }
    
    resetQuiz() {
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.userAnswers = [];
        this.questions = [];
        
        if (this.timer) {
            clearInterval(this.timer);
        }
        
        this.showScreen('landing');
    }
    
    showScreen(screenName) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Show target screen
        setTimeout(() => {
            document.getElementById(screenName + 'Screen').classList.add('active');
        }, 150);
    }
    
    showLoading(show) {
        if (show) {
            this.loadingOverlay.classList.add('active');
        } else {
            this.loadingOverlay.classList.remove('active');
        }
    }
    
    playSound(type) {
        const audio = document.getElementById(type + 'Sound');
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(() => {}); // Ignore audio play errors
        }
    }
    
    createConfetti() {
        const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe'];
        const confettiContainer = document.getElementById('confettiContainer');
        
        for (let i = 0; i < 100; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = Math.random() * 2 + 's';
            confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
            
            confettiContainer.appendChild(confetti);
            
            setTimeout(() => {
                confetti.remove();
            }, 4000);
        }
    }
    
    handleKeyboard(e) {
        if (document.getElementById('quizScreen').classList.contains('active')) {
            if (e.key >= '1' && e.key <= '4') {
                const answerIndex = parseInt(e.key) - 1;
                const answerBtn = document.querySelector(`[data-answer="${answerIndex}"]`);
                if (answerBtn && !answerBtn.disabled) {
                    answerBtn.click();
                }
            } else if (e.key === 'Enter') {
                const nextBtn = document.getElementById('nextQuestionBtn');
                if (nextBtn.style.display !== 'none') {
                    nextBtn.click();
                }
            } else if (e.key === 'Escape') {
                const skipBtn = document.getElementById('skipQuestionBtn');
                if (skipBtn.style.display !== 'none') {
                    skipBtn.click();
                }
            }
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new QuizApp();
});

// Add some additional utility functions
const utils = {
    formatTime: (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    },
    
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    throttle: (func, limit) => {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
};

// Add service worker for offline functionality (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}