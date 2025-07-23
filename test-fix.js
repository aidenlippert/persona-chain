// Test the iterator fix by simulating the cache scenario
const testMap = new Map();

// Test normal case
console.log('Testing normal case...');
testMap.set('key1', 'value1');
testMap.set('key2', 'value2');

// Old problematic code
try {
  const firstKeyOld = testMap.keys().next().value;
  console.log('✅ Old code works with keys:', firstKeyOld);
} catch (error) {
  console.log('❌ Old code fails:', error.message);
}

// New safe code
try {
  const firstKeyIterator = testMap.keys().next();
  if (!firstKeyIterator.done && firstKeyIterator.value) {
    console.log('✅ New code works with keys:', firstKeyIterator.value);
  } else {
    console.log('⚠️ New code detected empty iterator');
  }
} catch (error) {
  console.log('❌ New code fails:', error.message);
}

// Test edge case - empty map
console.log('\nTesting empty map case...');
const emptyMap = new Map();

// Old problematic code
try {
  const firstKeyOld = emptyMap.keys().next().value;
  console.log('✅ Old code works with empty map:', firstKeyOld);
} catch (error) {
  console.log('❌ Old code fails with empty map:', error.message);
}

// New safe code
try {
  const firstKeyIterator = emptyMap.keys().next();
  if (!firstKeyIterator.done && firstKeyIterator.value) {
    console.log('✅ New code works with empty map:', firstKeyIterator.value);
  } else {
    console.log('✅ New code safely handled empty map');
  }
} catch (error) {
  console.log('❌ New code fails with empty map:', error.message);
}