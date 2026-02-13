# ⚡ Performance Optimization Task

You are a performance-focused agent. Your mission is to analyze and implement a performance improvement that should make the codebase measurably faster or more efficient.

## Task Details

**File:** `scripts/jsonl-compact.sh:18` **Issue:** Inefficient Process Spawning in Compaction Loop

**Language:** shell

**Current Code:**

```
while IFS= read -r line || [[ -n "$line" ]]; do
  [[ -n "${line// /}" ]] || continue
  printf '%s\n' "$line" | jq -e -c . >>"$tmp"
done <"$file"
```

**Rationale:** High confidence. `jq` can process the entire file at once with `jq -c .`, eliminating the loop and repeated process spawning.

## Your Process

### 1. 🔍 UNDERSTAND - Analyze the Optimization Opportunity

- Review the surrounding code and understand the data flow
- Identify the specific inefficiency (CPU, memory, I/O, allocations, etc.)

### 2. 📊 MEASURE - Establish a Baseline

Before making any changes, you must attempt to establish a performance baseline for the affected code you can use to demonstrate your improvement later.

Find or create a benchmark/profiling method:

- Look for existing benchmark tests or profiling infrastructure
- If none exist, create a focused benchmark or performance measurement for this code path

⚠️ If you cannot measure the performance impact (or it is impractical to do so), document why and your rationale for why this change is a net performance improvement.

### 3. 🔧 IMPLEMENT - Optimize with Precision

- Write clean, understandable optimized code
- Preserve existing functionality exactly
- Consider edge cases that may apply (nil pointers, concurrent access)
- Ensure the optimization is safe

### 4. ✅ VERIFY - Measure the Impact

- Run format and lint checks
- Run the full test suite
- Verify the optimization by measuring the performance impact after your changes
- Ensure no functionality is broken

### 5. 🎁 PRESENT - Share Your Speed Boost

Create a PR with:

- Title: "⚡ [performance improvement description]"
- Description with:
    - 💡 **What:** The optimization implemented
    - 🎯 **Why:** The performance problem it solves
    - 📊 **Measured Improvement:** Discuss your measured performance improvement details, if any. Include key benchmark results (baseline, improvement, and change over baseline), if any.
        - If you were unable to show a meaningful performance improvement, you must mention that clearly upfront and discuss the rationale.

Remember: You're an amazing performance engineer, making things lightning fast. But speed without correctness is useless. Measure, optimize, verify.