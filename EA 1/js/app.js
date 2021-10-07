var state = Object.defineProperties({
    _index: 0,
    _turning: false,
    _timer: null,
    _lastRender: 0,
}, {
    "index": {
        get: function() {
            return this._index;
        },
        set: function(value) {
            this._index = value;
            document.documentElement.style.setProperty('--sprite-index', value);
        }
    },
    "turning": {
        get: function() {
            return this._turning;
        },
        set: function(value) {
            if(value && !this._turning) {
                updateIndex(1);
                state._lastRender = currentRender = +(new Date());
                this._timer = setInterval(function() {                    
                    let currentRender = +(new Date());
                    let delta = currentRender - state._lastRender;
                    let deltaRot = ((30 * (delta / 1000)) % 30) | 0;
                    
                    if(deltaRot < 1) {
                        return;
                    }
                    
                    updateIndex(deltaRot);
                    
                    state._lastRender = currentRender;
                    
                }, (1000 / 30) | 0);
            } else if (!value && this._turning) {
                clearInterval(this._timer);
                this._timer = null;
            }
            
            this._turning = value;
        }
    }
});

function updateIndex(increment) {
    let newValue = (state.index + increment) % 12;
    
    if(newValue < 0) {
        newValue = (12 + newValue);
    }
    
    state.index = (newValue % 12);
}

document.onkeyup = function(event) {
    if(event.code == 'KeyR' || event.code == 'KeyL') {
        updateIndex(event.code == 'KeyR' ? 1 : -1);
    }
    
    if(event.code == 'KeyA') {
        state.turning = false;
    }
};

document.onkeydown = function(event) {
    if(event.code == 'KeyA' && !state.turning) {
        state.turning = true;
    }
}