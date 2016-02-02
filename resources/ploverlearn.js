
///////////////////////////////////

var PloverLearn = function(fields) {
	this.fields = fields;
	this.index = 0;
};

PloverLearn.prototype.title = function() {
	return this.fields['title'];
};

PloverLearn.prototype.subtitle = function() {
	return this.fields['subtitle'];
};

PloverLearn.prototype.currentQuestion = function() {
	return this.fields['questions'][this.index][0];
};

PloverLearn.prototype.currentHint = function() {
	return this.fields['questions'][this.index][1];
};

PloverLearn.prototype.answerMatches = function(answer) {
	var question = this.currentQuestion();

	return answer.toLowerCase() == question.toLowerCase();
};

PloverLearn.prototype.isLastQuestion = function() {
	return this.index == this.fields['questions'].length-1;
};

PloverLearn.prototype.moveToNextQuestion = function() {
	if (this.isLastQuestion()) {
		this.index = 0;
	} else {
		this.index++;
	}
};

///////////////////////////////////


var STROKE_FINISHED_TIMEOUT = 30; // ms
var METRICS_DISPLAY_INTERVAL = 500; // ms
var HINT_OFFER_TIMES = 2;
var HINT_TEXT = '(hint?)';

var title = '';
var subtitle = '';
var buffer = '';
var strokeTimerID = 0;
var metricsDisplayTimerID = 0;
var allQuestions = [];
var questionsRemaining = [];
var currentHint = '';

var gameStartTime = 0;
var wordCount = 0;
var previousStrokeWasGood = true;

var misstrokesThisQuestion = 0;

function displayNextQuestion() {

	if (questionsRemaining.length==0) {
		endGame();
	} else {
		var nextQuestion = questionsRemaining.shift();
		$("#question").text(nextQuestion[0]);
		$("#answer").text('');
		$("#hint").text('');
		currentHint = nextQuestion[1];

		buffer = '';
		misstrokesThisQuestion = 0;
	}
}

function displayMetrics() {

	var msElapsed = (new Date().getTime()) - gameStartTime;
	var gameClockMinutes = Math.floor(msElapsed/60000);
	var gameClockSeconds = Math.floor(msElapsed/1000)%60;
	var gameClock = gameClockMinutes+':';
	if (gameClockSeconds<10) {
		gameClock += '0';
	}
	gameClock += gameClockSeconds;

	$("#time").text(gameClock);
	$("#wpm").text(Math.floor(wordCount / (msElapsed/60000)));
	$("#misstrokes").text(misstrokes);
	$("#laststreak").text(lastStreak);
	$("#beststreak").text(bestStreak);
}

// XXX problem here: does a streak include
// all strokes that make a correct word?
// Because then you'd get extra marks for fingerspelling everything.

function logGoodStroke() {
	if (previousStrokeWasGood) {
		lastStreak++;
	} else {
		// we're starting a new good streak
		lastStreak = 1;
	}

	if (bestStreak < lastStreak) {
		bestStreak = lastStreak;
	}

	previousStrokeWasGood = true;
}

function logMisstroke() {

	misstrokes++;
	misstrokesThisQuestion++;

	if (misstrokesThisQuestion >= HINT_OFFER_TIMES &&
		$("#hint").text()=='') {

		$("#hint").text(HINT_TEXT);
	}

	previousStrokeWasGood = false;
}

function strokeFinished() {

	// XXX this needs a rethink,
	// because at present if you enter
	// two misstrokes and then delete one,
	// you get another misstroke for that.

	$("#answer").text(buffer.slice(-40));

	var question = $("#question").text()

	if (buffer==question) {
		// correct!

		logGoodStroke();

		wordCount += question.split(' ').length;
		displayNextQuestion();
	} else if (question.indexOf(buffer)==0) {
		// partial match
		logGoodStroke();
	} else if (buffer!='') {
		// misstroke
		logMisstroke();
	}
}

function startGame() {
	questionsRemaining = allQuestions;
	displayNextQuestion();
	$("body").addClass("playing");

	gameStartTime = new Date().getTime();
	wordCount = 0;
	misstrokes = 0;
	previousStrokeWasGood = true;
	lastStreak = 0;
	bestStreak = 0;
	metricsDisplayTimerID = window.setInterval(displayMetrics, METRICS_DISPLAY_INTERVAL);
}

function endGame() {
	displayMetrics();
	window.clearInterval(metricsDisplayTimerID);
	$("body").removeClass("playing");
}

function initialSetup() {
	$(document).keypress(function(event) {

		if (!$("body").hasClass("playing")) {
			startGame();
		} else {

			if (event.which==8) {
				// Backspace
				buffer = buffer.slice(0, -1);
			} else if (event.which==13) {
				// Return: erase buffer
				buffer = '';
			} else if (event.which>=32 && event.which<=126) {
				// Character input.
				buffer += String.fromCharCode(event.which);
			}
		
			window.clearTimeout(strokeTimerID);
			strokeTimerID = window.setTimeout(strokeFinished, STROKE_FINISHED_TIMEOUT);
		}
	});

	$("#splash").mousedown(function(event) {
		startGame();
	});

	$("#hint").mousedown(function(event) {
		$("#hint").text(currentHint);
	});

	$("#title").text(theTitle);
	$("#subtitle").text(theSubtitle);
}

function ploverlearn(fields) {
	theTitle = fields['title']
	theSubtitle = fields['subtitle'];
	allQuestions = fields['questions'];

	$( initialSetup );

}
