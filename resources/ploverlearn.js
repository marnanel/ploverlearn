
///////////////////////////////////

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

// Returns whether the given answer matches the question,
// according to the current setup. (For example, case might
// or might not be significant, based on the flags.)
//
// Return values:
//   - 0: this is not a match
//   - "complete": this is a perfect match
//                    (the entire string matches)
//   - "partial": this is a partial match
//                    (it's partway to a complete match)
//
// For example, suppose the current rules mean an answer
// matches iff it's identical to the question, and that the
// question is "plover". Then:
//
//    ""       -> "partial"
//    "plov"   -> "partial"
//    "plover" -> "complete"
//    "xyzzy"  -> 0

PloverLearnQuiz.prototype.answerMatches = function(answer) {

	if (true) {
		var q = this.currentQuestion().toLowerCase();
		var a = answer.toLowerCase();

		if (q==a) {
			return "complete";
		} else if (new RegExp('^'+a).test(q)) {
			return "partial";
		} else {
			return 0;
		}
	}

	return "(impossible)";
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
	$("#wpm").text(Math.floor(wordCount / (msElapsed/60000)));
	$("#misstrokes").text(this.misstrokes);
	$("#laststreak").text(this.lastStreak);
	$("#beststreak").text(this.bestStreak);
};

// XXX problem here: does a streak include
// all strokes that make a correct word?
// Because then you'd get extra marks for fingerspelling everything.

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

		$("#hint").text(this.quiz.currentText());
	}

	this.previousStrokeWasGood = false;
};

PloverLearnGame.prototype.strokeFinished = function() {

	// XXX this needs a rethink,
	// because at present if you enter
	// two misstrokes and then delete one,
	// you get another misstroke for that.

	$("#answer").text(this.buffer.slice(-40));

	var question = $("#question").text()

// XXX this isn't going to work until we've fixed
// PloverLearnQuiz.answerMatches() to check for partial
// matches as well. Come back to it then.

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
	this.metricsDisplayTimerID = window.setInterval(this.displayMetrics, METRICS_DISPLAY_INTERVAL);
};

PloverLearnGame.prototype.endGame = function() {
	this.displayMetrics();
	window.clearInterval(this.metricsDisplayTimerID);
	$("body").removeClass("playing");
};

PloverLearnGame.prototype.initialSetup = function() {

	$(document).keypress(function(event) {

		if (!$("body").hasClass("playing")) {
			this.startGame();
		} else {

			if (event.which==8) {
				// Backspace
				this.buffer = this.buffer.slice(0, -1);
			} else if (event.which==13) {
				// Return: erase buffer
				this.buffer = '';
			} else if (event.which>=32 && event.which<=126) {
				// Character input.
				this.buffer += String.fromCharCode(event.which);
			}
		
			window.clearTimeout(this.strokeTimerID);
			this.strokeTimerID = window.setTimeout(this.strokeFinished, STROKE_FINISHED_TIMEOUT);
		}
	});

	$("#splash").mousedown(function(event) {
		this.startGame();
	});

	$("#hint").mousedown(function(event) {
		$("#hint").text(this.quiz.hint());
	});

	$("#title").text(this.quiz.title());
	$("#subtitle").text(this.quiz.subtitle());
};

function ploverlearn(fields) {

	var game = new PloverLearnGame(fields);

	$( ploverLearn.initialSetup );

}
