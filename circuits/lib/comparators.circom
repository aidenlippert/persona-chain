pragma circom 2.1.6;

/*
 * Comparator circuits for zero-knowledge proofs
 * Based on circomlib with optimizations for PersonaPass use cases
 */

// Check if a < b
template LessThan(n) {
    assert(n <= 252);
    signal input in[2];
    signal output out;

    component n2b = Num2Bits(n + 1);
    n2b.in <== in[1] - in[0] + (2 ** n) - 1;
    
    out <== n2b.out[n];
}

// Check if a <= b  
template LessEqThan(n) {
    assert(n <= 252);
    signal input in[2];
    signal output out;

    component n2b = Num2Bits(n + 1);
    n2b.in <== in[1] - in[0] + (2 ** n);
    
    out <== n2b.out[n];
}

// Check if a > b
template GreaterThan(n) {
    assert(n <= 252);
    signal input in[2];
    signal output out;

    component lt = LessThan(n);
    lt.in[0] <== in[1];
    lt.in[1] <== in[0];
    out <== lt.out;
}

// Check if a >= b
template GreaterEqThan(n) {
    assert(n <= 252);
    signal input in[2];
    signal output out;

    component lt = LessThan(n);
    lt.in[0] <== in[1];
    lt.in[1] <== in[0] + 1;
    out <== 1 - lt.out;
}

// Check if a == b
template IsEqual() {
    signal input in[2];
    signal output out;

    signal diff;
    diff <== in[1] - in[0];
    
    signal inv;
    inv <-- diff != 0 ? 1 / diff : 0;
    out <== 1 - diff * inv;
    diff * out === 0;
}


// Range check: min <= value <= max
template RangeCheck(n) {
    signal input value;
    signal input min;
    signal input max;
    signal output valid;

    component gte = GreaterEqThan(n);
    component lte = LessEqThan(n);
    
    gte.in[0] <== value;
    gte.in[1] <== min;
    
    lte.in[0] <== value;
    lte.in[1] <== max;
    
    valid <== gte.out * lte.out;
}

// Convert number to bits
template Num2Bits(n) {
    signal input in;
    signal output out[n];
    
    var lc = 0;
    var e2 = 1;
    
    for (var i = 0; i < n; i++) {
        out[i] <-- (in >> i) & 1;
        out[i] * (out[i] - 1) === 0;
        lc += out[i] * e2;
        e2 = e2 + e2;
    }
    
    lc === in;
}

// Convert bits to number
template Bits2Num(n) {
    signal input in[n];
    signal output out;
    
    var lc = 0;
    var e2 = 1;
    
    for (var i = 0; i < n; i++) {
        lc += in[i] * e2;
        e2 = e2 + e2;
    }
    
    out <== lc;
}