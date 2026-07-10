'use strict';

/**
 * Synchronous enqueue / deferred activate queue used by the comments boot
 * contract (and any similar "register before helpers exist" path).
 *
 * Browser: stub enqueue in comments/bootstrap.njk; activate+drain in
 * comments-bootstrap.min.js after runtime helpers are installed.
 *
 * @param {function(Function): void} [run] invoker for each callback (default: call)
 * @returns {{ enqueue: function(Function): void, activate: function(function(Function): void=): void, size: function(): number }}
 */
function createBootQueue(run) {
    const queue = [];
    let active = false;
    let runner = typeof run === 'function'
        ? run
        : (fn) => {
            if (typeof fn === 'function') fn();
        };

    function enqueue(fn) {
        if (typeof fn !== 'function') return;
        if (active) {
            runner(fn);
            return;
        }
        queue.push(fn);
    }

    function activate(nextRunner) {
        if (typeof nextRunner === 'function') runner = nextRunner;
        active = true;
        const pending = queue.splice(0, queue.length);
        for (let i = 0; i < pending.length; i += 1) {
            runner(pending[i]);
        }
    }

    function size() {
        return queue.length;
    }

    return { enqueue, activate, size };
}

module.exports = {
    createBootQueue
};
