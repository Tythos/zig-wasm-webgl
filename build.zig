const std = @import("std");

pub fn build(b: *std.Build) void {
    const exe = b.addExecutable(.{
        .name = "main",
        .root_source_file = b.path("src/main.zig"),
        .optimize = .ReleaseSmall,
        .target = b.resolveTargetQuery(
            .{ .os_tag = .freestanding, .cpu_arch = .wasm32 },
        ),
    });
    exe.entry = .disabled;
    exe.use_lld = true;
    exe.use_llvm = true;
    exe.rdynamic = true;
    b.install_path = "bin";
    const install = b.addInstallArtifact(exe, .{ .dest_dir = .{ .override = .prefix } });
    b.getInstallStep().dependOn(&install.step);
}
