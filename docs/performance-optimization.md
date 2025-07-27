# Performance Optimization

Django Power Tools includes comprehensive performance optimizations to handle large Django projects efficiently.

## Overview

The extension implements several performance optimization strategies:

1. **Progressive Analysis**: Files are analyzed incrementally rather than all at once
2. **Smart Caching**: Analysis results are cached with content-based validation
3. **Background Processing**: Long-running tasks execute in the background
4. **Debouncing**: Rapid file changes are batched to avoid redundant analysis
5. **Memory Management**: Automatic cache eviction when memory limits are reached

## Performance Goals

- Initial analysis time: **<5 seconds** for projects with 1000+ files
- Incremental updates: **<500ms** for single file changes
- Memory usage: **<100MB** for analysis cache
- UI responsiveness: **No blocking** during analysis

## Configuration

You can customize performance settings in VS Code preferences:

```json
{
    // Enable progressive background analysis (default: true)
    "djangoPowerTools.performance.enableProgressiveAnalysis": true,
    
    // Number of concurrent analysis workers (default: 3)
    "djangoPowerTools.performance.analysisWorkers": 3,
    
    // Maximum cache memory usage in MB (default: 100)
    "djangoPowerTools.performance.cacheMaxSizeMB": 100,
    
    // Delay before analyzing changed files in ms (default: 500)
    "djangoPowerTools.performance.debounceDelay": 500,
    
    // Enable analysis caching (default: true)
    "djangoPowerTools.performance.enableCaching": true
}
```

## Performance Commands

### Show Performance Report

View detailed performance metrics for your project:

1. Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
2. Run: `Django Power Tools: Show Performance Report`

The report includes:
- Analysis operation timings
- Cache hit/miss statistics
- Memory usage metrics
- Background worker status

### Clear Analysis Cache

If you experience issues or want to force a fresh analysis:

1. Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
2. Run: `Django Power Tools: Clear Analysis Cache`

This will remove all cached analysis results and trigger re-analysis on next access.

## How It Works

### Progressive Analysis

Instead of analyzing all files at startup, the extension:

1. **Quick Initial Scan**: Analyzes only critical files (settings.py, open files)
2. **Priority Queue**: Queues remaining files based on importance
3. **Background Processing**: Analyzes files progressively without blocking UI
4. **Smart Prioritization**: Re-prioritizes files when you open or edit them

### Caching Strategy

The cache system uses multiple layers:

1. **Content-Based Validation**: Cache entries include file content hash
2. **LRU Eviction**: Least recently used items removed when memory limit reached
3. **Automatic Invalidation**: Cache cleared when files change
4. **Memory Monitoring**: Tracks memory usage and evicts items proactively

### Debouncing

When you're actively editing files:

1. Changes are delayed by configured debounce time (default 500ms)
2. Multiple rapid changes are batched into single analysis
3. Active file gets highest priority in analysis queue
4. UI remains responsive during rapid edits

## Best Practices

### For Large Projects

1. **Keep default settings**: The defaults are optimized for most use cases
2. **Increase workers**: For very large projects, increase `analysisWorkers` to 5-7
3. **Monitor memory**: Use performance report to check cache memory usage
4. **Clear cache periodically**: If working across many branches, clear cache occasionally

### Troubleshooting

If you experience performance issues:

1. **Check performance report**: Identify which operations are slow
2. **Reduce workers**: If system is resource-constrained, reduce to 1-2 workers
3. **Increase debounce delay**: For very rapid file changes, increase to 1000-2000ms
4. **Disable progressive analysis**: As last resort, disable for simpler behavior

## Technical Details

### File Priority Algorithm

Files are prioritized based on:
- **Open in editor**: Priority 100
- **Recently modified**: Priority 80
- **Models**: Priority 50
- **URLs**: Priority 40
- **Views**: Priority 30
- **Other Python files**: Priority 10

### Memory Management

The cache implements a two-tier limit:
- **Item count limit**: Maximum number of cached items (default 1000)
- **Memory limit**: Maximum memory usage in MB (default 100)

When either limit is reached, least recently used items are evicted.

### Worker Pool

Background analysis uses a configurable worker pool:
- Workers process tasks concurrently
- Failed tasks are retried with exponential backoff
- Tasks can be cancelled if files change during analysis
- Workers automatically restart on errors

## Performance Benchmarks

Based on internal testing:

| Project Size | Initial Analysis | Incremental Update | Memory Usage |
|--------------|------------------|-------------------|--------------|
| Small (<100 files) | <1 second | <100ms | <10MB |
| Medium (100-500 files) | <3 seconds | <200ms | <50MB |
| Large (500-1000 files) | <5 seconds | <300ms | <80MB |
| Very Large (1000+ files) | <10 seconds | <500ms | <100MB |

These benchmarks assume default settings on modern hardware.