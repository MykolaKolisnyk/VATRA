# Draft: lazy story video conversion

Story editor accepts common video containers and converts locally to MP4 (H.264/AAC), with bounded input/output, 180s timeout and cancellation. No engine load on ordinary navigation; no media sent to the engine CDN. Existing private story storage and RLS remain unchanged.

Engine: @ffmpeg/core 0.12.10 single-threaded, pinned SHA-256 for ESM and WASM. Upstream: https://github.com/ffmpegwasm/ffmpeg.wasm and https://github.com/FFmpeg/FFmpeg. Before release verify package hashes against the published package, license/source obligations for the GPL-enabled build, CSP/worker compatibility, browser performance, actual conversions of MOV/AVI/MKV/WebM and HEVC where supported, and cancellation/failure paths. Not all codecs, corrupted/DRM files or mobile memory limits can be supported. Posts, clips and messages still require integration. Do not merge until verified.

## Shared integration

The shared post-media API accepts common video containers for feed/profile/community posts, post editing, stories, clips and post comments. All new videos use the same single-worker FIFO; already prepared File objects are recognized without repeat transcoding. Clip duration is verified on the converted MP4. Original limits and private Storage buckets remain unchanged. A preview of an unsupported source may be unavailable before conversion. Direct messages are not integrated. Synthetic MOV, AVI and MKV test conversions passed on Chromium in run 46130175400 before this integration. Re-run all checks; verify mobile memory and licensing obligations before release.

## Remux optimization and release constraints

The previous integrated draft passed all six GitHub checks in run 46131868824, including the real Chromium conversion. New conservative ffprobe-based remux path: only H.264 Baseline/Main/High 8-bit 4:2:0 square-pixel streams, <=1280 per dimension, <=60 fps, level <=4.1, <=4 Mbps, optional AAC-LC mono/stereo <=48 kHz, no rotation/display side data. All uncertain or incompatible files retain the full conversion path. Both paths strip container/stream metadata and chapters and use faststart. This avoids re-encoding, not the initial engine download. Re-run actual browser tests before merge.

The exact upstream release is https://github.com/ffmpegwasm/ffmpeg.wasm/tree/v12.15 (core package version 0.12.10; FFmpeg n5.1.4). Its core package declares GPL-2.0-or-later. The Dockerfile identifies dependencies but some branches are mutable, so exact corresponding source availability and notice obligations are not yet established. Do not mark this draft ready solely on passing CI. Also verify applicable codec patent terms before public release; no commercial service or license has been purchased.

The pinned ffprobe wrapper can return Module.ret (-1) even when the underlying C function returns normally. The probe therefore requires a parseable complete JSON result, no stderr error, and no explicit positive/nonzero exit code. The remux fixture checks encoded packet SHA-256 values before/after. Explanatory comments belong here rather than in shipped runtime JS, in accordance with VATRA's existing audit.
