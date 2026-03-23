// TimerModule.js - Timer functionality and solve time tracking

(function() {
    'use strict';

    // Timer state
    let startTime = null;
    let timerUpdateInterval = null;
    let timerIsRunning = false;
    let timeArray = [];

    // Callbacks for external integration
    let onTimeStopped = null;

    /**
     * SolveTime class - represents a single solve time with optional penalty
     */
    class SolveTime {
        constructor(time, penalty = '') {
            this.time = time;
            this.penalty = penalty;
        }

        toString(decimals = 2) {
            var timeString = this.time.toFixed(decimals);
            switch (this.penalty) {
                case '+2':
                    return (this.time + 2).toFixed(decimals) + '+';
                case 'DNF':
                    return 'DNF' + "(" + timeString + ")";
                default:
                    return timeString;
            }
        }

        timeValue() {
            switch (this.penalty) {
                case '+2':
                    return this.time + 2;
                case 'DNF':
                    return Infinity;
                default:
                    return this.time;
            }
        }
    }

    /**
     * Check if timer element is visible
     * @returns {boolean}
     */
    function isTimerVisible() {
        const timer = document.getElementById("timer");
        return timer && timer.style.display !== 'none';
    }

    /**
     * Start the timer
     */
    function startTimer() {
        if (timerIsRunning) {
            return;
        }

        if (!isTimerVisible()) {
            return;
        }

        startTime = Date.now();
        timerUpdateInterval = setInterval(updateTimerDisplay, 1);
        timerIsRunning = true;
    }

    /**
     * Stop the timer
     * @param {boolean} logTime - Whether to log the time
     * @returns {number|NaN} The elapsed time or NaN
     */
    function stopTimer(logTime = true) {
        if (!timerIsRunning) {
            return NaN;
        }

        if (!isTimerVisible()) {
            return NaN;
        }

        clearInterval(timerUpdateInterval);
        timerIsRunning = false;

        const timerElement = document.getElementById("timer");
        const time = parseFloat(timerElement.innerHTML);

        if (isNaN(time)) {
            return NaN;
        }

        if (logTime) {
            const solveTime = new SolveTime(time, '');
            timeArray.push(solveTime);

            // Call external callback if set
            if (onTimeStopped) {
                onTimeStopped(solveTime);
            }

            updateTimeList();
        }

        updateStats();
        return time;
    }

    /**
     * Update the timer display
     */
    function updateTimerDisplay() {
        const timerElement = document.getElementById("timer");
        if (timerElement && startTime) {
            timerElement.innerHTML = ((Date.now() - startTime) / 1000).toFixed(2);
        }
    }

    /**
     * Calculate mean of time array
     * @param {SolveTime[]} times - Array of solve times
     * @returns {number} Mean time
     */
    function getMean(times) {
        if (times.length === 0) return 0;

        let total = 0;
        for (let i = 0; i < times.length; i++) {
            total += times[i].timeValue();
        }
        return total / times.length;
    }

    /**
     * Update statistics display
     */
    function updateStats() {
        const statistics = document.getElementById("statistics");
        if (!statistics) return;

        statistics.innerHTML = "&nbsp;";

        if (timeArray.length !== 0) {
            statistics.innerHTML += "Mean of " + timeArray.length + ": " + getMean(timeArray).toFixed(2) + "<br>";
        }
    }

    /**
     * Update time list display
     */
    function updateTimeList() {
        const timeList = document.getElementById("timeList");
        const scrollTimes = document.getElementById("scrollTimes");

        if (!timeList) return;

        timeList.innerHTML = "&nbsp;";
        for (let i = 0; i < timeArray.length; i++) {
            timeList.innerHTML += timeArray[i].toString();
            timeList.innerHTML += " ";
        }

        if (scrollTimes) {
            scrollTimes.scrollTop = scrollTimes.scrollHeight;
        }
    }

    /**
     * Clear all times
     */
    function clearTimes() {
        timeArray = [];
        updateTimeList();
        updateStats();
    }

    /**
     * Get time array
     * @returns {SolveTime[]}
     */
    function getTimeArray() {
        return timeArray;
    }

    /**
     * Add a solve time to the array
     * @param {SolveTime} solveTime
     */
    function addTime(solveTime) {
        timeArray.push(solveTime);
        updateTimeList();
        updateStats();
    }

    /**
     * Check if timer is currently running
     * @returns {boolean}
     */
    function isRunning() {
        return timerIsRunning;
    }

    /**
     * Set timer display text
     * @param {string} text
     */
    function setTimerText(text) {
        const timerElement = document.getElementById("timer");
        if (timerElement) {
            timerElement.innerHTML = text;
        }
    }

    /**
     * Set callback for when time is stopped
     * @param {function} callback
     */
    function setOnTimeStopped(callback) {
        onTimeStopped = callback;
    }

    /**
     * Show or hide the timer
     * @param {boolean} show
     */
    function setTimerVisible(show) {
        const timer = document.getElementById("timer");
        const timerDiv = document.getElementById("timer_div");

        if (show) {
            if (timer) timer.style.display = 'block';
            if (timerDiv) timerDiv.style.display = 'block';
        } else {
            if (timer) timer.style.display = 'none';
            if (timerDiv) timerDiv.style.display = 'none';
        }
    }

    // Export to global scope
    window.TimerModule = {
        SolveTime,
        startTimer,
        stopTimer,
        updateTimerDisplay,
        getMean,
        updateStats,
        updateTimeList,
        clearTimes,
        getTimeArray,
        addTime,
        isRunning,
        setTimerText,
        setOnTimeStopped,
        setTimerVisible,
        isTimerVisible
    };

    // Also export individual functions for backward compatibility
    window.SolveTime = SolveTime;
    window.startTimer = startTimer;
    window.stopTimer = stopTimer;
    window.updateTimer = updateTimerDisplay;
    window.getMean = getMean;
    window.updateStats = updateStats;
    window.updateTimeList = updateTimeList;
    window.timeArray = timeArray;

})();
