var PloverLearnQuiz = function(fields) {
	this.fields = fields;
	this.index = 0;
};

PloverLearnQuiz.prototype.title = function() {
	return this.fields['title'];
};

PloverLearnQuiz.prototype.subtitle = function() {
	return this.fields['subtitle'];
};

PloverLearnQuiz.prototype.currentQuestion = function() {
	return this.fields['questions'][this.index][0];
};

PloverLearnQuiz.prototype.currentHint = function() {
	return this.fields['questions'][this.index][1];
};

// Returns true if the given answer matches the question,
// according to the current setup. (For example, case might
// or might not be significant, based on the flags.)
// Returns false otherwise.

PloverLearnQuiz.prototype.answerMatches = function(answer) {

	var question = this.currentQuestion();
	var flags = '';
	var pattern;

	if (this.fields['ignore_characters']) {
		$.each(this.fields['ignore_characters'].split(''),
		function(i, char) {
			answer = answer.split(char).join('');
			question = question.split(char).join('');
		});
	}

	if (!this.fields['case_sensitive']) {
		flags = flags + 'i';
	}

	if (this.fields['require_spaces']) {
		pattern = '^\\s*'+question+'\\s+$';
	} else {
		pattern = '^\\s*'+question+'$';
	}

	var questionRegExp = new RegExp(pattern, flags);
	return questionRegExp.test(answer);
};

PloverLearnQuiz.prototype.isLastQuestion = function() {
	return this.index == this.fields['questions'].length-1;
};

PloverLearnQuiz.prototype.moveToNextQuestion = function() {
	if (this.isLastQuestion()) {
		this.index = 0;
	} else {
		this.index++;
	}
};

///////////////////////////////////

var PloverLearnGame = function(fields) {

	this.quiz = new PloverLearnQuiz(fields);
	this.title = '';
	this.subtitle = '';
	this.buffer = '';
	this.strokeTimerID = 0;
	this.metricsDisplayTimerID = 0;
	this.strokeInput = new Array();

	this.gameStartTime = 0;
	this.wordCount = 0;
	this.previousStrokeWasGood = true;

	this.misstrokesThisQuestion = 0;
};

///////////////////////////////////

var STROKE_FINISHED_TIMEOUT = 30; // ms
var METRICS_DISPLAY_INTERVAL = 500; // ms
var HINT_OFFER_TIMES = 2;
var HINT_TEXT = '(hint?)';

PloverLearnGame.prototype.displayNextQuestion = function() {

	if (this.quiz.isLastQuestion()) {
		this.endGame();
	} else {
		this.quiz.moveToNextQuestion();

		$("#question").text(this.quiz.currentQuestion())
		$("#answer").text('');
		$("#hint").text('');

		this.buffer = '';
		this.misstrokesThisQuestion = 0;
	}
};

PloverLearnGame.prototype.displayMetrics = function() {

	var msElapsed = (new Date().getTime()) - this.gameStartTime;
	var gameClockMinutes = Math.floor(msElapsed/60000);
	var gameClockSeconds = Math.floor(msElapsed/1000)%60;
	var gameClock = gameClockMinutes+':';
	if (gameClockSeconds<10) {
		gameClock += '0';
	}
	gameClock += gameClockSeconds;

	$("#time").text(gameClock);
	$("#wpm").text(Math.floor(this.wordCount / (msElapsed/60000)));
	$("#misstrokes").text(this.misstrokes);
	$("#laststreak").text(this.lastStreak);
	$("#beststreak").text(this.bestStreak);
};

PloverLearnGame.prototype.logGoodStroke = function() {

	if (this.previousStrokeWasGood) {
		this.lastStreak++;
	} else {
		// we're starting a new good streak
		this.lastStreak = 1;
	}

	if (this.bestStreak < this.lastStreak) {
		this.bestStreak = this.lastStreak;
	}

	this.previousStrokeWasGood = true;
};

PloverLearnGame.prototype.logMisstroke = function() {

	this.misstrokes++;
	this.misstrokesThisQuestion++;

	if (this.misstrokesThisQuestion >= HINT_OFFER_TIMES &&
		$("#hint").text()=='') {

		$("#hint").text(this.quiz.currentHint());
	}

	this.previousStrokeWasGood = false;
};

PloverLearnGame.prototype.strokeFinished = function() {

	// make sure we *have* a stroke, just in case.
	if (this.strokeInput.length==0) {
		return;
	}

	// we take a copy of this.buffer
	// because "this" is obscured by $.each()
	var b = this.buffer;
	var isCorrection = true;

	$.each(this.strokeInput,
		function(index, keycode) {
			if (keycode==8) {
				// Backspace
				b = b.slice(0, -1);
			} else if (keycode>=32 && keycode<=126) {
				// Character input.
				b += String.fromCharCode(keycode);
			}

			if (keycode!=8) {
				isCorrection = false;
			}
		});

	this.buffer = b;
	this.strokeInput.length = 0;

	$("#answer").text(this.buffer.slice(-40));

	if (isCorrection) {
		this.logMisstroke();
	}

	if (this.quiz.answerMatches(this.buffer)) {

		this.logGoodStroke();

		this.wordCount += this.quiz.currentQuestion().split(' ').length;
		this.displayNextQuestion();
	}
};

PloverLearnGame.prototype.startGame = function() {
	this.displayNextQuestion();
	$("body").addClass("playing");

	this.gameStartTime = new Date().getTime();
	this.wordCount = 0;
	this.misstrokes = 0;
	this.previousStrokeWasGood = true;
	this.lastStreak = 0;
	this.bestStreak = 0;
	this.metricsDisplayTimerID = window.setInterval( $.proxy(this.displayMetrics, this),
		METRICS_DISPLAY_INTERVAL);
};

PloverLearnGame.prototype.endGame = function() {
	this.displayMetrics();
	window.clearInterval(this.metricsDisplayTimerID);
	$("body").removeClass("playing");
};

PloverLearnGame.prototype.handleKeypress = function(keycode) {

	if (!$("body").hasClass("playing")) {
		this.startGame();
	} else {

		this.strokeInput.push(keycode);


		window.clearTimeout(this.strokeTimerID);
		this.strokeTimerID = window.setTimeout($.proxy(this.strokeFinished, this),
			STROKE_FINISHED_TIMEOUT);
	}
};

function initialSetup(fields) {

	var game = new PloverLearnGame(fields);

	$(document).keypress(function(event) {
		game.handleKeypress(event.which);
	});

	$("#splash").mousedown(function(event) {
		game.startGame();
	});

	$("#hint").mousedown(function(event) {
		$("#hint").text(game.quiz.hint());
	});

	$("#title").text(game.quiz.title());
	$("#subtitle").text(game.quiz.subtitle());
};

function ploverlearn(fields) {

	$(function() { initialSetup(fields) } );

}
