# Draft: lazy story video conversion

Story editor accepts common video containers and converts locally to MP4 (H.264/AAC), with bounded input/output, 180s timeout and cancellation. No engine load on ordinary navigation; no media sent to the engine CDN. Existing private story storage and RLS remain unchanged.

Engine: @ffmpeg/core 0.12.10 single-threaded, pinned SHA-256 for ESM and WASM. Upstream: https://github.com/ffmpegwasm/ffmpeg.wasm and https://github.com/FFmpeg/FFmpeg. Before release verify package hashes against the published package, license/source obligations for the GPL-enabled build, CSP/worker compatibility, browser performance, actual conversions of MOV/AVI/MKV/WebM and HEVC where supported, and cancellation/failure paths. Not all codecs, corrupted/DRM files or mobile memory limits can be supported. Posts, clips and messages still require integration. Do not merge until verified.

## Shared integration

The shared post-media API accepts common video containers for feed/profile/community posts, post editing, stories, clips and post comments. All new videos use the same single-worker FIFO; already prepared File objects are recognized without repeat transcoding. Clip duration is verified on the converted MP4. Original limits and private Storage buckets remain unchanged. A preview of an unsupported source may be unavailable before conversion. Direct messages are not integrated. Synthetic MOV, AVI and MKV test conversions passed on Chromium in run 46130175400 before this integration. Re-run all checks; verify mobile memory and licensing obligations before release.
