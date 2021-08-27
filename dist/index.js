#!/usr/bin/env node
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 942:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";
/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.win32 = exports.wsl = exports.linux = exports.darwin = exports.darwinFast = void 0;
const fs = __nccwpck_require__(747);
const path = __nccwpck_require__(622);
const os_1 = __nccwpck_require__(87);
const child_process_1 = __nccwpck_require__(129);
const escapeRegExp = __nccwpck_require__(322);
const log = __nccwpck_require__(292);
const utils_1 = __nccwpck_require__(968);
const newLineRegex = /\r?\n/;
/**
 * check for MacOS default app paths first to avoid waiting for the slow lsregister command
 */
function darwinFast() {
    const priorityOptions = [
        process.env.CHROME_PATH,
        process.env.LIGHTHOUSE_CHROMIUM_PATH,
        '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    ];
    for (const chromePath of priorityOptions) {
        if (chromePath && canAccess(chromePath))
            return chromePath;
    }
    return darwin()[0];
}
exports.darwinFast = darwinFast;
function darwin() {
    const suffixes = ['/Contents/MacOS/Google Chrome Canary', '/Contents/MacOS/Google Chrome'];
    const LSREGISTER = '/System/Library/Frameworks/CoreServices.framework' +
        '/Versions/A/Frameworks/LaunchServices.framework' +
        '/Versions/A/Support/lsregister';
    const installations = [];
    const customChromePath = resolveChromePath();
    if (customChromePath) {
        installations.push(customChromePath);
    }
    child_process_1.execSync(`${LSREGISTER} -dump` +
        ' | grep -i \'google chrome\\( canary\\)\\?\\.app\'' +
        ' | awk \'{$1=""; print $0}\'')
        .toString()
        .split(newLineRegex)
        .forEach((inst) => {
        suffixes.forEach(suffix => {
            const execPath = path.join(inst.substring(0, inst.indexOf('.app') + 4).trim(), suffix);
            if (canAccess(execPath) && installations.indexOf(execPath) === -1) {
                installations.push(execPath);
            }
        });
    });
    // Retains one per line to maintain readability.
    // clang-format off
    const home = escapeRegExp(process.env.HOME || os_1.homedir());
    const priorities = [
        { regex: new RegExp(`^${home}/Applications/.*Chrome\\.app`), weight: 50 },
        { regex: new RegExp(`^${home}/Applications/.*Chrome Canary\\.app`), weight: 51 },
        { regex: /^\/Applications\/.*Chrome.app/, weight: 100 },
        { regex: /^\/Applications\/.*Chrome Canary.app/, weight: 101 },
        { regex: /^\/Volumes\/.*Chrome.app/, weight: -2 },
        { regex: /^\/Volumes\/.*Chrome Canary.app/, weight: -1 },
    ];
    if (process.env.LIGHTHOUSE_CHROMIUM_PATH) {
        priorities.unshift({ regex: new RegExp(escapeRegExp(process.env.LIGHTHOUSE_CHROMIUM_PATH)), weight: 150 });
    }
    if (process.env.CHROME_PATH) {
        priorities.unshift({ regex: new RegExp(escapeRegExp(process.env.CHROME_PATH)), weight: 151 });
    }
    // clang-format on
    return sort(installations, priorities);
}
exports.darwin = darwin;
function resolveChromePath() {
    if (canAccess(process.env.CHROME_PATH)) {
        return process.env.CHROME_PATH;
    }
    if (canAccess(process.env.LIGHTHOUSE_CHROMIUM_PATH)) {
        log.warn('ChromeLauncher', 'LIGHTHOUSE_CHROMIUM_PATH is deprecated, use CHROME_PATH env variable instead.');
        return process.env.LIGHTHOUSE_CHROMIUM_PATH;
    }
    return undefined;
}
/**
 * Look for linux executables in 3 ways
 * 1. Look into CHROME_PATH env variable
 * 2. Look into the directories where .desktop are saved on gnome based distro's
 * 3. Look for google-chrome-stable & google-chrome executables by using the which command
 */
function linux() {
    let installations = [];
    // 1. Look into CHROME_PATH env variable
    const customChromePath = resolveChromePath();
    if (customChromePath) {
        installations.push(customChromePath);
    }
    // 2. Look into the directories where .desktop are saved on gnome based distro's
    const desktopInstallationFolders = [
        path.join(os_1.homedir(), '.local/share/applications/'),
        '/usr/share/applications/',
    ];
    desktopInstallationFolders.forEach(folder => {
        installations = installations.concat(findChromeExecutables(folder));
    });
    // Look for google-chrome(-stable) & chromium(-browser) executables by using the which command
    const executables = [
        'google-chrome-stable',
        'google-chrome',
        'chromium-browser',
        'chromium',
    ];
    executables.forEach((executable) => {
        try {
            const chromePath = child_process_1.execFileSync('which', [executable], { stdio: 'pipe' }).toString().split(newLineRegex)[0];
            if (canAccess(chromePath)) {
                installations.push(chromePath);
            }
        }
        catch (e) {
            // Not installed.
        }
    });
    if (!installations.length) {
        throw new utils_1.ChromePathNotSetError();
    }
    const priorities = [
        { regex: /chrome-wrapper$/, weight: 51 },
        { regex: /google-chrome-stable$/, weight: 50 },
        { regex: /google-chrome$/, weight: 49 },
        { regex: /chromium-browser$/, weight: 48 },
        { regex: /chromium$/, weight: 47 },
    ];
    if (process.env.LIGHTHOUSE_CHROMIUM_PATH) {
        priorities.unshift({ regex: new RegExp(escapeRegExp(process.env.LIGHTHOUSE_CHROMIUM_PATH)), weight: 100 });
    }
    if (process.env.CHROME_PATH) {
        priorities.unshift({ regex: new RegExp(escapeRegExp(process.env.CHROME_PATH)), weight: 101 });
    }
    return sort(uniq(installations.filter(Boolean)), priorities);
}
exports.linux = linux;
function wsl() {
    // Manually populate the environment variables assuming it's the default config
    process.env.LOCALAPPDATA = utils_1.getLocalAppDataPath(`${process.env.PATH}`);
    process.env.PROGRAMFILES = '/mnt/c/Program Files';
    process.env['PROGRAMFILES(X86)'] = '/mnt/c/Program Files (x86)';
    return win32();
}
exports.wsl = wsl;
function win32() {
    const installations = [];
    const suffixes = [
        `${path.sep}Google${path.sep}Chrome SxS${path.sep}Application${path.sep}chrome.exe`,
        `${path.sep}Google${path.sep}Chrome${path.sep}Application${path.sep}chrome.exe`
    ];
    const prefixes = [
        process.env.LOCALAPPDATA, process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)']
    ].filter(Boolean);
    const customChromePath = resolveChromePath();
    if (customChromePath) {
        installations.push(customChromePath);
    }
    prefixes.forEach(prefix => suffixes.forEach(suffix => {
        const chromePath = path.join(prefix, suffix);
        if (canAccess(chromePath)) {
            installations.push(chromePath);
        }
    }));
    return installations;
}
exports.win32 = win32;
function sort(installations, priorities) {
    const defaultPriority = 10;
    return installations
        // assign priorities
        .map((inst) => {
        for (const pair of priorities) {
            if (pair.regex.test(inst)) {
                return { path: inst, weight: pair.weight };
            }
        }
        return { path: inst, weight: defaultPriority };
    })
        // sort based on priorities
        .sort((a, b) => (b.weight - a.weight))
        // remove priority flag
        .map(pair => pair.path);
}
function canAccess(file) {
    if (!file) {
        return false;
    }
    try {
        fs.accessSync(file);
        return true;
    }
    catch (e) {
        return false;
    }
}
function uniq(arr) {
    return Array.from(new Set(arr));
}
function findChromeExecutables(folder) {
    const argumentsRegex = /(^[^ ]+).*/; // Take everything up to the first space
    const chromeExecRegex = '^Exec=\/.*\/(google-chrome|chrome|chromium)-.*';
    let installations = [];
    if (canAccess(folder)) {
        // Output of the grep & print looks like:
        //    /opt/google/chrome/google-chrome --profile-directory
        //    /home/user/Downloads/chrome-linux/chrome-wrapper %U
        let execPaths;
        // Some systems do not support grep -R so fallback to -r.
        // See https://github.com/GoogleChrome/chrome-launcher/issues/46 for more context.
        try {
            execPaths = child_process_1.execSync(`grep -ER "${chromeExecRegex}" ${folder} | awk -F '=' '{print $2}'`, { stdio: 'pipe' });
        }
        catch (e) {
            execPaths = child_process_1.execSync(`grep -Er "${chromeExecRegex}" ${folder} | awk -F '=' '{print $2}'`, { stdio: 'pipe' });
        }
        execPaths = execPaths.toString()
            .split(newLineRegex)
            .map((execPath) => execPath.replace(argumentsRegex, '$1'));
        execPaths.forEach((execPath) => canAccess(execPath) && installations.push(execPath));
    }
    return installations;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hyb21lLWZpbmRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9jaHJvbWUtZmluZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7O0dBSUc7QUFDSCxZQUFZLENBQUM7OztBQUViLHlCQUEwQjtBQUMxQiw2QkFBOEI7QUFDOUIsMkJBQTJCO0FBQzNCLGlEQUFxRDtBQUNyRCxxREFBc0Q7QUFDdEQsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLG1CQUFtQixDQUFDLENBQUM7QUFFekMsbUNBQW1FO0FBRW5FLE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQztBQUk3Qjs7R0FFRztBQUNILFNBQWdCLFVBQVU7SUFDeEIsTUFBTSxlQUFlLEdBQTRCO1FBQy9DLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVztRQUN2QixPQUFPLENBQUMsR0FBRyxDQUFDLHdCQUF3QjtRQUNwQyw0RUFBNEU7UUFDNUUsOERBQThEO0tBQy9ELENBQUM7SUFFRixLQUFLLE1BQU0sVUFBVSxJQUFJLGVBQWUsRUFBRTtRQUN4QyxJQUFJLFVBQVUsSUFBSSxTQUFTLENBQUMsVUFBVSxDQUFDO1lBQUUsT0FBTyxVQUFVLENBQUM7S0FDNUQ7SUFFRCxPQUFPLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO0FBQ3BCLENBQUM7QUFiRCxnQ0FhQztBQUVELFNBQWdCLE1BQU07SUFDcEIsTUFBTSxRQUFRLEdBQUcsQ0FBQyxzQ0FBc0MsRUFBRSwrQkFBK0IsQ0FBQyxDQUFDO0lBRTNGLE1BQU0sVUFBVSxHQUFHLG1EQUFtRDtRQUNsRSxpREFBaUQ7UUFDakQsZ0NBQWdDLENBQUM7SUFFckMsTUFBTSxhQUFhLEdBQWtCLEVBQUUsQ0FBQztJQUV4QyxNQUFNLGdCQUFnQixHQUFHLGlCQUFpQixFQUFFLENBQUM7SUFDN0MsSUFBSSxnQkFBZ0IsRUFBRTtRQUNwQixhQUFhLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUM7S0FDdEM7SUFFRCx3QkFB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

/***/ }),

/***/ 234:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";
/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.killAll = exports.launch = exports.Launcher = void 0;
const childProcess = __nccwpck_require__(129);
const fs = __nccwpck_require__(747);
const net = __nccwpck_require__(631);
const chromeFinder = __nccwpck_require__(942);
const random_port_1 = __nccwpck_require__(254);
const flags_1 = __nccwpck_require__(978);
const utils_1 = __nccwpck_require__(968);
const log = __nccwpck_require__(292);
const spawn = childProcess.spawn;
const execSync = childProcess.execSync;
const isWsl = utils_1.getPlatform() === 'wsl';
const isWindows = utils_1.getPlatform() === 'win32';
const _SIGINT = 'SIGINT';
const _SIGINT_EXIT_CODE = 130;
const _SUPPORTED_PLATFORMS = new Set(['darwin', 'linux', 'win32', 'wsl']);
const instances = new Set();
const sigintListener = async () => {
    await killAll();
    process.exit(_SIGINT_EXIT_CODE);
};
async function launch(opts = {}) {
    opts.handleSIGINT = utils_1.defaults(opts.handleSIGINT, true);
    const instance = new Launcher(opts);
    // Kill spawned Chrome process in case of ctrl-C.
    if (opts.handleSIGINT && instances.size === 0) {
        process.on(_SIGINT, sigintListener);
    }
    instances.add(instance);
    await instance.launch();
    const kill = async () => {
        instances.delete(instance);
        if (instances.size === 0) {
            process.removeListener(_SIGINT, sigintListener);
        }
        return instance.kill();
    };
    return { pid: instance.pid, port: instance.port, kill, process: instance.chrome };
}
exports.launch = launch;
async function killAll() {
    let errors = [];
    for (const instance of instances) {
        try {
            await instance.kill();
            // only delete if kill did not error
            // this means erroring instances remain in the Set
            instances.delete(instance);
        }
        catch (err) {
            errors.push(err);
        }
    }
    return errors;
}
exports.killAll = killAll;
class Launcher {
    constructor(opts = {}, moduleOverrides = {}) {
        this.opts = opts;
        this.tmpDirandPidFileReady = false;
        this.fs = moduleOverrides.fs || fs;
        this.spawn = moduleOverrides.spawn || spawn;
        log.setLevel(utils_1.defaults(this.opts.logLevel, 'silent'));
        // choose the first one (default)
        this.startingUrl = utils_1.defaults(this.opts.startingUrl, 'about:blank');
        this.chromeFlags = utils_1.defaults(this.opts.chromeFlags, []);
        this.requestedPort = utils_1.defaults(this.opts.port, 0);
        this.chromePath = this.opts.chromePath;
        this.ignoreDefaultFlags = utils_1.defaults(this.opts.ignoreDefaultFlags, false);
        this.connectionPollInterval = utils_1.defaults(this.opts.connectionPollInterval, 500);
        this.maxConnectionRetries = utils_1.defaults(this.opts.maxConnectionRetries, 50);
        this.envVars = utils_1.defaults(opts.envVars, Object.assign({}, process.env));
        if (typeof this.opts.userDataDir === 'boolean') {
            if (!this.opts.userDataDir) {
                this.useDefaultProfile = true;
                this.userDataDir = undefined;
            }
            else {
                throw new utils_1.InvalidUserDataDirectoryError();
            }
        }
        else {
            this.useDefaultProfile = false;
            this.userDataDir = this.opts.userDataDir;
        }
    }
    get flags() {
        const flags = this.ignoreDefaultFlags ? [] : flags_1.DEFAULT_FLAGS.slice();
        flags.push(`--remote-debugging-port=${this.port}`);
        if (!this.ignoreDefaultFlags && utils_1.getPlatform() === 'linux') {
            flags.push('--disable-setuid-sandbox');
        }
        if (!this.useDefaultProfile) {
            // Place Chrome profile in a custom location we'll rm -rf later
            // If in WSL, we need to use the Windows format
            flags.push(`--user-data-dir=${isWsl ? utils_1.toWinDirFormat(this.userDataDir) : this.userDataDir}`);
        }
        flags.push(...this.chromeFlags);
        flags.push(this.startingUrl);
        return flags;
    }
    static defaultFlags() {
        return flags_1.DEFAULT_FLAGS.slice();
    }
    /** Returns the highest priority chrome installation. */
    static getFirstInstallation() {
        if (utils_1.getPlatform() === 'darwin')
            return chromeFinder.darwinFast();
        return chromeFinder[utils_1.getPlatform()]()[0];
    }
    /** Returns all available chrome installations in decreasing priority order. */
    static getInstallations() {
        return chromeFinder[utils_1.getPlatform()]();
    }
    // Wrapper function to enable easy testing.
    makeTmpDir() {
        return utils_1.makeTmpDir();
    }
    prepare() {
        const platform = utils_1.getPlatform();
        if (!_SUPPORTED_PLATFORMS.has(platform)) {
            throw new utils_1.UnsupportedPlatformError();
        }
        this.userDataDir = this.userDataDir || this.makeTmpDir();
        this.outFile = this.fs.openSync(`${this.userDataDir}/chrome-out.log`, 'a');
        this.errFile = this.fs.openSync(`${this.userDataDir}/chrome-err.log`, 'a');
        // fix for Node4
        // you can't pass a fd to fs.writeFileSync
        this.pidFile = `${this.userDataDir}/chrome.pid`;
        log.verbose('ChromeLauncher', `created ${this.userDataDir}`);
        this.tmpDirandPidFileReady = true;
    }
    async launch() {
        if (this.requestedPort !== 0) {
            this.port = this.requestedPort;
            // If an explict port is passed first look for an open connection...
            try {
                return await this.isDebuggerReady();
            }
            catch (err) {
                log.log('ChromeLauncher', `No debugging port found on port ${this.port}, launching a new Chrome.`);
            }
        }
        if (this.chromePath === undefined) {
            const installation = Launcher.getFirstInstallation();
            if (!installation) {
                throw new utils_1.ChromeNotInstalledError();
            }
            this.chromePath = installation;
        }
        if (!this.tmpDirandPidFileReady) {
            this.prepare();
        }
        this.pid = await this.spawnProcess(this.chromePath);
        return Promise.resolve();
    }
    async spawnProcess(execPath) {
        const spawnPromise = (async () => {
            if (this.chrome) {
                log.log('ChromeLauncher', `Chrome already running with pid ${this.chrome.pid}.`);
                return this.chrome.pid;
            }
            // If a zero value port is set, it means the launcher
            // is responsible for generating the port number.
            // We do this here so that we can know the port before
            // we pass it into chrome.
            if (this.requestedPort === 0) {
                this.port = await random_port_1.getRandomPort();
            }
            log.verbose('ChromeLauncher', `Launching with command:\n"${execPath}" ${this.flags.join(' ')}`);
            const chrome = this.spawn(execPath, this.flags, { detached: true, stdio: ['ignore', this.outFile, this.errFile], env: this.envVars });
            this.chrome = chrome;
            this.fs.writeFileSync(this.pidFile, chrome.pid.toString());
            log.verbose('ChromeLauncher', `Chrome running with pid ${chrome.pid} on port ${this.port}.`);
            return chrome.pid;
        })();
        const pid = await spawnPromise;
        await this.waitUntilReady();
        return pid;
    }
    cleanup(client) {
        if (client) {
            client.removeAllListeners();
            client.end();
            client.destroy();
            client.unref();
        }
    }
    // resolves if ready, rejects otherwise
    isDebuggerReady() {
        return new Promise((resolve, reject) => {
            const client = net.createConnection(this.port);
            client.once('error', err => {
                this.cleanup(client);
                reject(err);
            });
            client.once('connect', () => {
                this.cleanup(client);
                resolve();
            });
        });
    }
    // resolves when debugger is ready, rejects after 10 polls
    waitUntilReady() {
        const launcher = this;
        return new Promise((resolve, reject) => {
            let retries = 0;
            let waitStatus = 'Waiting for browser.';
            const poll = () => {
                if (retries === 0) {
                    log.log('ChromeLauncher', waitStatus);
                }
                retries++;
                waitStatus += '..';
                log.log('ChromeLauncher', waitStatus);
                launcher.isDebuggerReady()
                    .then(() => {
                    log.log('ChromeLauncher', waitStatus + `${log.greenify(log.tick)}`);
                    resolve();
                })
                    .catch(err => {
                    if (retries > launcher.maxConnectionRetries) {
                        log.error('ChromeLauncher', err.message);
                        const stderr = this.fs.readFileSync(`${this.userDataDir}/chrome-err.log`, { encoding: 'utf-8' });
                        log.error('ChromeLauncher', `Logging contents of ${this.userDataDir}/chrome-err.log`);
                        log.error('ChromeLauncher', stderr);
                        return reject(err);
                    }
                    utils_1.delay(launcher.connectionPollInterval).then(poll);
                });
            };
            poll();
        });
    }
    kill() {
        return new Promise((resolve, reject) => {
            if (this.chrome) {
                this.chrome.on('close', () => {
                    delete this.chrome;
                    this.destroyTmp().then(resolve);
                });
                log.log('ChromeLauncher', `Killing Chrome instance ${this.chrome.pid}`);
                try {
                    if (isWindows) {
                        // While pipe is the default, stderr also gets printed to process.stderr
                        // if you don't explicitly set `stdio`
                        execSync(`taskkill /pid ${this.chrome.pid} /T /F`, { stdio: 'pipe' });
                    }
                    else {
                        process.kill(-this.chrome.pid);
                    }
                }
                catch (err) {
                    const message = `Chrome could not be killed ${err.message}`;
                    log.warn('ChromeLauncher', message);
                    reject(new Error(message));
                }
            }
            else {
                // fail silently as we did not start chrome
                resolve();
            }
        });
    }
    destroyTmp() {
        return new Promise(resolve => {
            // Only clean up the tmp dir if we created it.
            if (this.userDataDir === undefined || this.opts.userDataDir !== undefined) {
                return resolve();
            }
            if (this.outFile) {
                this.fs.closeSync(this.outFile);
                delete this.outFile;
            }
            if (this.errFile) {
                this.fs.closeSync(this.errFile);
                delete this.errFile;
            }
            this.fs.rmdir(this.userDataDir, { recursive: true }, () => resolve());
        });
    }
}
exports.Launcher = Launcher;
;
exports.default = Launcher;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hyb21lLWxhdW5jaGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2Nocm9tZS1sYXVuY2hlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OztHQUlHO0FBQ0gsWUFBWSxDQUFDOzs7QUFFYiw4Q0FBOEM7QUFDOUMseUJBQXlCO0FBQ3pCLDJCQUEyQjtBQUMzQixnREFBZ0Q7QUFDaEQsK0NBQTRDO0FBQzVDLG1DQUFzQztBQUN0QyxtQ0FBbUs7QUFFbkssTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLG1CQUFtQixDQUFDLENBQUM7QUFDekMsTUFBTSxLQUFLLEdBQUcsWUFBWSxDQUFDLEtBQUssQ0FBQztBQUNqQyxNQUFNLFFBQVEsR0FBRyxZQUFZLENBQUMsUUFBUSxDQUFDO0FBQ3ZDLE1BQU0sS0FBSyxHQUFHLG1CQUFXLEVBQUUsS0FBSyxLQUFLLENBQUM7QUFDdEMsTUFBTSxTQUFTLEdBQUcsbUJBQVcsRUFBRSxLQUFLLE9BQU8sQ0FBQztBQUM1QyxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUM7QUFDekIsTUFBTSxpQkFBaUIsR0FBRyxHQUFHLENBQUM7QUFDOUIsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFJMUUsTUFBTSxTQUFTLEdBQUcsSUFBSSxHQUFHLEVBQVksQ0FBQztBQTRCdEMsTUFBTSxjQUFjLEdBQUcsS0FBSyxJQUFJLEVBQUU7SUFDaEMsTUFBTSxPQUFPLEVBQUUsQ0FBQztJQUNoQixPQUFPLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFDbEMsQ0FBQyxDQUFDO0FBRUYsS0FBSyxVQUFVLE1BQU0sQ0FBQyxPQUFnQixFQUFFO0lBQ3RDLElBQUksQ0FBQyxZQUFZLEdBQUcsZ0JBQVEsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBRXRELE1B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

/***/ }),

/***/ 978:
/***/ ((__unused_webpack_module, exports) => {

"use strict";
/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.DEFAULT_FLAGS = void 0;
// https://github.com/GoogleChrome/chrome-launcher/blob/master/docs/chrome-flags-for-tools.md
exports.DEFAULT_FLAGS = [
    // Disable built-in Google Translate service
    '--disable-features=Translate',
    // Disable all chrome extensions
    '--disable-extensions',
    // Disable some extensions that aren't affected by --disable-extensions
    '--disable-component-extensions-with-background-pages',
    // Disable various background network services, including extension updating,
    //   safe browsing service, upgrade detector, translate, UMA
    '--disable-background-networking',
    // Don't update the browser 'components' listed at chrome://components/
    '--disable-component-update',
    // Disables client-side phishing detection.
    '--disable-client-side-phishing-detection',
    // Disable syncing to a Google account
    '--disable-sync',
    // Disable reporting to UMA, but allows for collection
    '--metrics-recording-only',
    // Disable installation of default apps on first run
    '--disable-default-apps',
    // Mute any audio
    '--mute-audio',
    // Disable the default browser check, do not prompt to set it as such
    '--no-default-browser-check',
    // Skip first run wizards
    '--no-first-run',
    // Disable backgrounding renders for occluded windows
    '--disable-backgrounding-occluded-windows',
    // Disable renderer process backgrounding
    '--disable-renderer-backgrounding',
    // Disable task throttling of timer tasks from background pages.
    '--disable-background-timer-throttling',
    // Disable the default throttling of IPC between renderer & browser processes.
    '--disable-ipc-flooding-protection',
    // Avoid potential instability of using Gnome Keyring or KDE wallet. crbug.com/571003 crbug.com/991424
    '--password-store=basic',
    // Use mock keychain on Mac to prevent blocking permissions dialogs
    '--use-mock-keychain',
    // Disable background tracing (aka slow reports & deep reports) to avoid 'Tracing already started'
    '--force-fieldtrials=*BackgroundTracing/default/',
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmxhZ3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvZmxhZ3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7R0FJRztBQUNILFlBQVksQ0FBQzs7O0FBRWIsNkZBQTZGO0FBRWhGLFFBQUEsYUFBYSxHQUEwQjtJQUNsRCw0Q0FBNEM7SUFDNUMsOEJBQThCO0lBQzlCLGdDQUFnQztJQUNoQyxzQkFBc0I7SUFDdEIsdUVBQXVFO0lBQ3ZFLHNEQUFzRDtJQUN0RCw2RUFBNkU7SUFDN0UsNERBQTREO0lBQzVELGlDQUFpQztJQUNqQyx1RUFBdUU7SUFDdkUsNEJBQTRCO0lBQzVCLDJDQUEyQztJQUMzQywwQ0FBMEM7SUFDMUMsc0NBQXNDO0lBQ3RDLGdCQUFnQjtJQUNoQixzREFBc0Q7SUFDdEQsMEJBQTBCO0lBQzFCLG9EQUFvRDtJQUNwRCx3QkFBd0I7SUFDeEIsaUJBQWlCO0lBQ2pCLGNBQWM7SUFDZCxxRUFBcUU7SUFDckUsNEJBQTRCO0lBQzVCLHlCQUF5QjtJQUN6QixnQkFBZ0I7SUFDaEIscURBQXFEO0lBQ3JELDBDQUEwQztJQUMxQyx5Q0FBeUM7SUFDekMsa0NBQWtDO0lBQ2xDLGdFQUFnRTtJQUNoRSx1Q0FBdUM7SUFDdkMsOEVBQThFO0lBQzlFLG1DQUFtQztJQUNuQyxzR0FBc0c7SUFDdEcsd0JBQXdCO0lBQ3hCLG1FQUFtRTtJQUNuRSxxQkFBcUI7SUFDckIsa0dBQWtHO0lBQ2xHLGlEQUFpRDtDQUNsRCxDQUFDIn0=

/***/ }),

/***/ 105:
/***/ (function(__unused_webpack_module, exports, __nccwpck_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
__exportStar(__nccwpck_require__(234), exports);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQUEsb0RBQWtDIn0=

/***/ }),

/***/ 254:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";
/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getRandomPort = void 0;
const http_1 = __nccwpck_require__(605);
/**
 * Return a random, unused port.
 */
function getRandomPort() {
    return new Promise((resolve, reject) => {
        const server = http_1.createServer();
        server.listen(0);
        server.once('listening', () => {
            const { port } = server.address();
            server.close(() => resolve(port));
        });
        server.once('error', reject);
    });
}
exports.getRandomPort = getRandomPort;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmFuZG9tLXBvcnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvcmFuZG9tLXBvcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7R0FJRztBQUNILFlBQVksQ0FBQzs7O0FBRWIsK0JBQWtDO0FBR2xDOztHQUVHO0FBQ0gsU0FBZ0IsYUFBYTtJQUMzQixPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1FBQ3JDLE1BQU0sTUFBTSxHQUFHLG1CQUFZLEVBQUUsQ0FBQztRQUM5QixNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2pCLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLEdBQUcsRUFBRTtZQUM1QixNQUFNLEVBQUMsSUFBSSxFQUFDLEdBQUcsTUFBTSxDQUFDLE9BQU8sRUFBaUIsQ0FBQztZQUMvQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3BDLENBQUMsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDL0IsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBVkQsc0NBVUMifQ==

/***/ }),

/***/ 968:
/***/ ((__unused_webpack_module, exports, __nccwpck_require__) => {

"use strict";
/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getLocalAppDataPath = exports.toWinDirFormat = exports.makeTmpDir = exports.getPlatform = exports.ChromeNotInstalledError = exports.UnsupportedPlatformError = exports.InvalidUserDataDirectoryError = exports.ChromePathNotSetError = exports.LauncherError = exports.delay = exports.defaults = void 0;
const path_1 = __nccwpck_require__(622);
const child_process_1 = __nccwpck_require__(129);
const fs_1 = __nccwpck_require__(747);
const isWsl = __nccwpck_require__(959);
function defaults(val, def) {
    return typeof val === 'undefined' ? def : val;
}
exports.defaults = defaults;
async function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}
exports.delay = delay;
class LauncherError extends Error {
    constructor(message = 'Unexpected error', code) {
        super();
        this.message = message;
        this.code = code;
        this.stack = new Error().stack;
        return this;
    }
}
exports.LauncherError = LauncherError;
class ChromePathNotSetError extends LauncherError {
    constructor() {
        super(...arguments);
        this.message = 'The CHROME_PATH environment variable must be set to a Chrome/Chromium executable no older than Chrome stable.';
        this.code = "ERR_LAUNCHER_PATH_NOT_SET" /* ERR_LAUNCHER_PATH_NOT_SET */;
    }
}
exports.ChromePathNotSetError = ChromePathNotSetError;
class InvalidUserDataDirectoryError extends LauncherError {
    constructor() {
        super(...arguments);
        this.message = 'userDataDir must be false or a path.';
        this.code = "ERR_LAUNCHER_INVALID_USER_DATA_DIRECTORY" /* ERR_LAUNCHER_INVALID_USER_DATA_DIRECTORY */;
    }
}
exports.InvalidUserDataDirectoryError = InvalidUserDataDirectoryError;
class UnsupportedPlatformError extends LauncherError {
    constructor() {
        super(...arguments);
        this.message = `Platform ${getPlatform()} is not supported.`;
        this.code = "ERR_LAUNCHER_UNSUPPORTED_PLATFORM" /* ERR_LAUNCHER_UNSUPPORTED_PLATFORM */;
    }
}
exports.UnsupportedPlatformError = UnsupportedPlatformError;
class ChromeNotInstalledError extends LauncherError {
    constructor() {
        super(...arguments);
        this.message = 'No Chrome installations found.';
        this.code = "ERR_LAUNCHER_NOT_INSTALLED" /* ERR_LAUNCHER_NOT_INSTALLED */;
    }
}
exports.ChromeNotInstalledError = ChromeNotInstalledError;
function getPlatform() {
    return isWsl ? 'wsl' : process.platform;
}
exports.getPlatform = getPlatform;
function makeTmpDir() {
    switch (getPlatform()) {
        case 'darwin':
        case 'linux':
            return makeUnixTmpDir();
        case 'wsl':
            // We populate the user's Windows temp dir so the folder is correctly created later
            process.env.TEMP = getLocalAppDataPath(`${process.env.PATH}`);
        case 'win32':
            return makeWin32TmpDir();
        default:
            throw new UnsupportedPlatformError();
    }
}
exports.makeTmpDir = makeTmpDir;
function toWinDirFormat(dir = '') {
    const results = /\/mnt\/([a-z])\//.exec(dir);
    if (!results) {
        return dir;
    }
    const driveLetter = results[1];
    return dir.replace(`/mnt/${driveLetter}/`, `${driveLetter.toUpperCase()}:\\`)
        .replace(/\//g, '\\');
}
exports.toWinDirFormat = toWinDirFormat;
function getLocalAppDataPath(path) {
    const userRegExp = /\/mnt\/([a-z])\/Users\/([^\/:]+)\/AppData\//;
    const results = userRegExp.exec(path) || [];
    return `/mnt/${results[1]}/Users/${results[2]}/AppData/Local`;
}
exports.getLocalAppDataPath = getLocalAppDataPath;
function makeUnixTmpDir() {
    return child_process_1.execSync('mktemp -d -t lighthouse.XXXXXXX').toString().trim();
}
function makeWin32TmpDir() {
    const winTmpPath = process.env.TEMP || process.env.TMP ||
        (process.env.SystemRoot || process.env.windir) + '\\temp';
    const randomNumber = Math.floor(Math.random() * 9e7 + 1e7);
    const tmpdir = path_1.join(winTmpPath, 'lighthouse.' + randomNumber);
    fs_1.mkdirSync(tmpdir, { recursive: true });
    return tmpdir;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7R0FJRztBQUNILFlBQVksQ0FBQzs7O0FBRWIsK0JBQTBCO0FBQzFCLGlEQUF1QztBQUN2QywyQkFBNkI7QUFDN0IsZ0NBQWlDO0FBU2pDLFNBQWdCLFFBQVEsQ0FBSSxHQUFnQixFQUFFLEdBQU07SUFDbEQsT0FBTyxPQUFPLEdBQUcsS0FBSyxXQUFXLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO0FBQ2hELENBQUM7QUFGRCw0QkFFQztBQUVNLEtBQUssVUFBVSxLQUFLLENBQUMsSUFBWTtJQUN0QyxPQUFPLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQzNELENBQUM7QUFGRCxzQkFFQztBQUVELE1BQWEsYUFBYyxTQUFRLEtBQUs7SUFDdEMsWUFBbUIsVUFBa0Isa0JBQWtCLEVBQVMsSUFBYTtRQUMzRSxLQUFLLEVBQUUsQ0FBQztRQURTLFlBQU8sR0FBUCxPQUFPLENBQTZCO1FBQVMsU0FBSSxHQUFKLElBQUksQ0FBUztRQUUzRSxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksS0FBSyxFQUFFLENBQUMsS0FBSyxDQUFDO1FBQy9CLE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztDQUNGO0FBTkQsc0NBTUM7QUFFRCxNQUFhLHFCQUFzQixTQUFRLGFBQWE7SUFBeEQ7O1FBQ0UsWUFBTyxHQUNILCtHQUErRyxDQUFDO1FBQ3BILFNBQUksK0RBQThDO0lBQ3BELENBQUM7Q0FBQTtBQUpELHNEQUlDO0FBRUQsTUFBYSw2QkFBOEIsU0FBUSxhQUFhO0lBQWhFOztRQUNFLFlBQU8sR0FBRyxzQ0FBc0MsQ0FBQztRQUNqRCxTQUFJLDZGQUE2RDtJQUNuRSxDQUFDO0NBQUE7QUFIRCxzRUFH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

/***/ }),

/***/ 349:
/***/ ((module, exports, __nccwpck_require__) => {

/**
 * This is the web browser implementation of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = __nccwpck_require__(210);
exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;
exports.storage = 'undefined' != typeof chrome
               && 'undefined' != typeof chrome.storage
                  ? chrome.storage.local
                  : localstorage();

/**
 * Colors.
 */

exports.colors = [
  'lightseagreen',
  'forestgreen',
  'goldenrod',
  'dodgerblue',
  'darkorchid',
  'crimson'
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

function useColors() {
  // NB: In an Electron preload script, document will be defined but not fully
  // initialized. Since we know we're in Chrome, we'll just detect this case
  // explicitly
  if (typeof window !== 'undefined' && window.process && window.process.type === 'renderer') {
    return true;
  }

  // is webkit? http://stackoverflow.com/a/16459606/376773
  // document is undefined in react-native: https://github.com/facebook/react-native/pull/1632
  return (typeof document !== 'undefined' && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance) ||
    // is firebug? http://stackoverflow.com/a/398120/376773
    (typeof window !== 'undefined' && window.console && (window.console.firebug || (window.console.exception && window.console.table))) ||
    // is firefox >= v31?
    // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
    (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31) ||
    // double check webkit in userAgent just in case we are in a worker
    (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/));
}

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

exports.formatters.j = function(v) {
  try {
    return JSON.stringify(v);
  } catch (err) {
    return '[UnexpectedJSONParseError]: ' + err.message;
  }
};


/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function formatArgs(args) {
  var useColors = this.useColors;

  args[0] = (useColors ? '%c' : '')
    + this.namespace
    + (useColors ? ' %c' : ' ')
    + args[0]
    + (useColors ? '%c ' : ' ')
    + '+' + exports.humanize(this.diff);

  if (!useColors) return;

  var c = 'color: ' + this.color;
  args.splice(1, 0, c, 'color: inherit')

  // the final "%c" is somewhat tricky, because there could be other
  // arguments passed either before or after the %c, so we need to
  // figure out the correct index to insert the CSS into
  var index = 0;
  var lastC = 0;
  args[0].replace(/%[a-zA-Z%]/g, function(match) {
    if ('%%' === match) return;
    index++;
    if ('%c' === match) {
      // we only are interested in the *last* %c
      // (the user may have provided their own)
      lastC = index;
    }
  });

  args.splice(lastC, 0, c);
}

/**
 * Invokes `console.log()` when available.
 * No-op when `console.log` is not a "function".
 *
 * @api public
 */

function log() {
  // this hackery is required for IE8/9, where
  // the `console.log` function doesn't have 'apply'
  return 'object' === typeof console
    && console.log
    && Function.prototype.apply.call(console.log, console, arguments);
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */

function save(namespaces) {
  try {
    if (null == namespaces) {
      exports.storage.removeItem('debug');
    } else {
      exports.storage.debug = namespaces;
    }
  } catch(e) {}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */

function load() {
  var r;
  try {
    r = exports.storage.debug;
  } catch(e) {}

  // If debug isn't set in LS, and we're in Electron, try to load $DEBUG
  if (!r && typeof process !== 'undefined' && 'env' in process) {
    r = process.env.DEBUG;
  }

  return r;
}

/**
 * Enable namespaces listed in `localStorage.debug` initially.
 */

exports.enable(load());

/**
 * Localstorage attempts to return the localstorage.
 *
 * This is necessary because safari throws
 * when a user disables cookies/localstorage
 * and you attempt to access it.
 *
 * @return {LocalStorage}
 * @api private
 */

function localstorage() {
  try {
    return window.localStorage;
  } catch (e) {}
}


/***/ }),

/***/ 210:
/***/ ((module, exports, __nccwpck_require__) => {


/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = createDebug.debug = createDebug['default'] = createDebug;
exports.coerce = coerce;
exports.disable = disable;
exports.enable = enable;
exports.enabled = enabled;
exports.humanize = __nccwpck_require__(93);

/**
 * The currently active debug mode names, and names to skip.
 */

exports.names = [];
exports.skips = [];

/**
 * Map of special "%n" handling functions, for the debug "format" argument.
 *
 * Valid key names are a single, lower or upper-case letter, i.e. "n" and "N".
 */

exports.formatters = {};

/**
 * Previous log timestamp.
 */

var prevTime;

/**
 * Select a color.
 * @param {String} namespace
 * @return {Number}
 * @api private
 */

function selectColor(namespace) {
  var hash = 0, i;

  for (i in namespace) {
    hash  = ((hash << 5) - hash) + namespace.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }

  return exports.colors[Math.abs(hash) % exports.colors.length];
}

/**
 * Create a debugger with the given `namespace`.
 *
 * @param {String} namespace
 * @return {Function}
 * @api public
 */

function createDebug(namespace) {

  function debug() {
    // disabled?
    if (!debug.enabled) return;

    var self = debug;

    // set `diff` timestamp
    var curr = +new Date();
    var ms = curr - (prevTime || curr);
    self.diff = ms;
    self.prev = prevTime;
    self.curr = curr;
    prevTime = curr;

    // turn the `arguments` into a proper Array
    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i];
    }

    args[0] = exports.coerce(args[0]);

    if ('string' !== typeof args[0]) {
      // anything else let's inspect with %O
      args.unshift('%O');
    }

    // apply any `formatters` transformations
    var index = 0;
    args[0] = args[0].replace(/%([a-zA-Z%])/g, function(match, format) {
      // if we encounter an escaped % then don't increase the array index
      if (match === '%%') return match;
      index++;
      var formatter = exports.formatters[format];
      if ('function' === typeof formatter) {
        var val = args[index];
        match = formatter.call(self, val);

        // now we need to remove `args[index]` since it's inlined in the `format`
        args.splice(index, 1);
        index--;
      }
      return match;
    });

    // apply env-specific formatting (colors, etc.)
    exports.formatArgs.call(self, args);

    var logFn = debug.log || exports.log || console.log.bind(console);
    logFn.apply(self, args);
  }

  debug.namespace = namespace;
  debug.enabled = exports.enabled(namespace);
  debug.useColors = exports.useColors();
  debug.color = selectColor(namespace);

  // env-specific initialization logic for debug instances
  if ('function' === typeof exports.init) {
    exports.init(debug);
  }

  return debug;
}

/**
 * Enables a debug mode by namespaces. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} namespaces
 * @api public
 */

function enable(namespaces) {
  exports.save(namespaces);

  exports.names = [];
  exports.skips = [];

  var split = (typeof namespaces === 'string' ? namespaces : '').split(/[\s,]+/);
  var len = split.length;

  for (var i = 0; i < len; i++) {
    if (!split[i]) continue; // ignore empty strings
    namespaces = split[i].replace(/\*/g, '.*?');
    if (namespaces[0] === '-') {
      exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
    } else {
      exports.names.push(new RegExp('^' + namespaces + '$'));
    }
  }
}

/**
 * Disable debug output.
 *
 * @api public
 */

function disable() {
  exports.enable('');
}

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

function enabled(name) {
  var i, len;
  for (i = 0, len = exports.skips.length; i < len; i++) {
    if (exports.skips[i].test(name)) {
      return false;
    }
  }
  for (i = 0, len = exports.names.length; i < len; i++) {
    if (exports.names[i].test(name)) {
      return true;
    }
  }
  return false;
}

/**
 * Coerce `val`.
 *
 * @param {Mixed} val
 * @return {Mixed}
 * @api private
 */

function coerce(val) {
  if (val instanceof Error) return val.stack || val.message;
  return val;
}


/***/ }),

/***/ 583:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

/**
 * Detect Electron renderer process, which is node, but we should
 * treat as a browser.
 */

if (typeof process !== 'undefined' && process.type === 'renderer') {
  module.exports = __nccwpck_require__(349);
} else {
  module.exports = __nccwpck_require__(797);
}


/***/ }),

/***/ 797:
/***/ ((module, exports, __nccwpck_require__) => {

/**
 * Module dependencies.
 */

var tty = __nccwpck_require__(867);
var util = __nccwpck_require__(669);

/**
 * This is the Node.js implementation of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = __nccwpck_require__(210);
exports.init = init;
exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;

/**
 * Colors.
 */

exports.colors = [6, 2, 3, 4, 5, 1];

/**
 * Build up the default `inspectOpts` object from the environment variables.
 *
 *   $ DEBUG_COLORS=no DEBUG_DEPTH=10 DEBUG_SHOW_HIDDEN=enabled node script.js
 */

exports.inspectOpts = Object.keys(process.env).filter(function (key) {
  return /^debug_/i.test(key);
}).reduce(function (obj, key) {
  // camel-case
  var prop = key
    .substring(6)
    .toLowerCase()
    .replace(/_([a-z])/g, function (_, k) { return k.toUpperCase() });

  // coerce string value into JS value
  var val = process.env[key];
  if (/^(yes|on|true|enabled)$/i.test(val)) val = true;
  else if (/^(no|off|false|disabled)$/i.test(val)) val = false;
  else if (val === 'null') val = null;
  else val = Number(val);

  obj[prop] = val;
  return obj;
}, {});

/**
 * The file descriptor to write the `debug()` calls to.
 * Set the `DEBUG_FD` env variable to override with another value. i.e.:
 *
 *   $ DEBUG_FD=3 node script.js 3>debug.log
 */

var fd = parseInt(process.env.DEBUG_FD, 10) || 2;

if (1 !== fd && 2 !== fd) {
  util.deprecate(function(){}, 'except for stderr(2) and stdout(1), any other usage of DEBUG_FD is deprecated. Override debug.log if you want to use a different log function (https://git.io/debug_fd)')()
}

var stream = 1 === fd ? process.stdout :
             2 === fd ? process.stderr :
             createWritableStdioStream(fd);

/**
 * Is stdout a TTY? Colored output is enabled when `true`.
 */

function useColors() {
  return 'colors' in exports.inspectOpts
    ? Boolean(exports.inspectOpts.colors)
    : tty.isatty(fd);
}

/**
 * Map %o to `util.inspect()`, all on a single line.
 */

exports.formatters.o = function(v) {
  this.inspectOpts.colors = this.useColors;
  return util.inspect(v, this.inspectOpts)
    .split('\n').map(function(str) {
      return str.trim()
    }).join(' ');
};

/**
 * Map %o to `util.inspect()`, allowing multiple lines if needed.
 */

exports.formatters.O = function(v) {
  this.inspectOpts.colors = this.useColors;
  return util.inspect(v, this.inspectOpts);
};

/**
 * Adds ANSI color escape codes if enabled.
 *
 * @api public
 */

function formatArgs(args) {
  var name = this.namespace;
  var useColors = this.useColors;

  if (useColors) {
    var c = this.color;
    var prefix = '  \u001b[3' + c + ';1m' + name + ' ' + '\u001b[0m';

    args[0] = prefix + args[0].split('\n').join('\n' + prefix);
    args.push('\u001b[3' + c + 'm+' + exports.humanize(this.diff) + '\u001b[0m');
  } else {
    args[0] = new Date().toUTCString()
      + ' ' + name + ' ' + args[0];
  }
}

/**
 * Invokes `util.format()` with the specified arguments and writes to `stream`.
 */

function log() {
  return stream.write(util.format.apply(util, arguments) + '\n');
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */

function save(namespaces) {
  if (null == namespaces) {
    // If you set a process.env field to null or undefined, it gets cast to the
    // string 'null' or 'undefined'. Just delete instead.
    delete process.env.DEBUG;
  } else {
    process.env.DEBUG = namespaces;
  }
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */

function load() {
  return process.env.DEBUG;
}

/**
 * Copied from `node/src/node.js`.
 *
 * XXX: It's lame that node doesn't expose this API out-of-the-box. It also
 * relies on the undocumented `tty_wrap.guessHandleType()` which is also lame.
 */

function createWritableStdioStream (fd) {
  var stream;
  var tty_wrap = process.binding('tty_wrap');

  // Note stream._type is used for test-module-load-list.js

  switch (tty_wrap.guessHandleType(fd)) {
    case 'TTY':
      stream = new tty.WriteStream(fd);
      stream._type = 'tty';

      // Hack to have stream not keep the event loop alive.
      // See https://github.com/joyent/node/issues/1726
      if (stream._handle && stream._handle.unref) {
        stream._handle.unref();
      }
      break;

    case 'FILE':
      var fs = __nccwpck_require__(747);
      stream = new fs.SyncWriteStream(fd, { autoClose: false });
      stream._type = 'fs';
      break;

    case 'PIPE':
    case 'TCP':
      var net = __nccwpck_require__(631);
      stream = new net.Socket({
        fd: fd,
        readable: false,
        writable: true
      });

      // FIXME Should probably have an option in net.Socket to create a
      // stream from an existing fd which is writable only. But for now
      // we'll just add this hack and set the `readable` member to false.
      // Test: ./node test/fixtures/echo.js < /etc/passwd
      stream.readable = false;
      stream.read = null;
      stream._type = 'pipe';

      // FIXME Hack to have stream not keep the event loop alive.
      // See https://github.com/joyent/node/issues/1726
      if (stream._handle && stream._handle.unref) {
        stream._handle.unref();
      }
      break;

    default:
      // Probably an error on in uv_guess_handle()
      throw new Error('Implement me. Unknown stream file type!');
  }

  // For supporting legacy API we put the FD here.
  stream.fd = fd;

  stream._isStdio = true;

  return stream;
}

/**
 * Init logic for `debug` instances.
 *
 * Create a new `inspectOpts` object in case `useColors` is set
 * differently for a particular `debug` instance.
 */

function init (debug) {
  debug.inspectOpts = {};

  var keys = Object.keys(exports.inspectOpts);
  for (var i = 0; i < keys.length; i++) {
    debug.inspectOpts[keys[i]] = exports.inspectOpts[keys[i]];
  }
}

/**
 * Enable namespaces listed in `process.env.DEBUG` initially.
 */

exports.enable(load());


/***/ }),

/***/ 322:
/***/ ((module) => {

"use strict";


module.exports = string => {
	if (typeof string !== 'string') {
		throw new TypeError('Expected a string');
	}

	// Escape characters with special meaning either inside or outside character sets.
	// Use a simple backslash escape when it’s always valid, and a \unnnn escape when the simpler form would be disallowed by Unicode patterns’ stricter grammar.
	return string
		.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')
		.replace(/-/g, '\\x2d');
};


/***/ }),

/***/ 398:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";

const fs = __nccwpck_require__(747);

let isDocker;

function hasDockerEnv() {
	try {
		fs.statSync('/.dockerenv');
		return true;
	} catch (_) {
		return false;
	}
}

function hasDockerCGroup() {
	try {
		return fs.readFileSync('/proc/self/cgroup', 'utf8').includes('docker');
	} catch (_) {
		return false;
	}
}

module.exports = () => {
	if (isDocker === undefined) {
		isDocker = hasDockerEnv() || hasDockerCGroup();
	}

	return isDocker;
};


/***/ }),

/***/ 959:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";

const os = __nccwpck_require__(87);
const fs = __nccwpck_require__(747);
const isDocker = __nccwpck_require__(398);

const isWsl = () => {
	if (process.platform !== 'linux') {
		return false;
	}

	if (os.release().toLowerCase().includes('microsoft')) {
		if (isDocker()) {
			return false;
		}

		return true;
	}

	try {
		return fs.readFileSync('/proc/version', 'utf8').toLowerCase().includes('microsoft') ?
			!isDocker() : false;
	} catch (_) {
		return false;
	}
};

if (process.env.__IS_WSL_TEST__) {
	module.exports = isWsl;
} else {
	module.exports = isWsl();
}


/***/ }),

/***/ 292:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

"use strict";
/**
 * @license Copyright 2016 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */


const debug = __nccwpck_require__(583);
const marky = __nccwpck_require__(152);

const EventEmitter = __nccwpck_require__(614).EventEmitter;
const isWindows = process.platform === 'win32';

// process.browser is set when browserify'd via the `process` npm module
const isBrowser = process.browser;

const colors = {
  red: isBrowser ? 'crimson' : 1,
  yellow: isBrowser ? 'gold' : 3,
  cyan: isBrowser ? 'darkturquoise' : 6,
  green: isBrowser ? 'forestgreen' : 2,
  blue: isBrowser ? 'steelblue' : 4,
  magenta: isBrowser ? 'palevioletred' : 5,
};

// allow non-red/yellow colors for debug()
debug.colors = [colors.cyan, colors.green, colors.blue, colors.magenta];

class Emitter extends EventEmitter {
  /**
   * Fires off all status updates. Listen with
   * `require('lib/log').events.addListener('status', callback)`
   * @param {string} title
   * @param {!Array<*>} argsArray
   */
  issueStatus(title, argsArray) {
    if (title === 'status' || title === 'statusEnd') {
      this.emit(title, [title, ...argsArray]);
    }
  }

  /**
   * Fires off all warnings. Listen with
   * `require('lib/log').events.addListener('warning', callback)`
   * @param {string} title
   * @param {!Array<*>} argsArray
   */
  issueWarning(title, argsArray) {
    this.emit('warning', [title, ...argsArray]);
  }
}

const loggersByTitle = {};
const loggingBufferColumns = 25;
let level_;

class Log {
  static _logToStdErr(title, argsArray) {
    const log = Log.loggerfn(title);
    log(...argsArray);
  }

  static loggerfn(title) {
    title = `LH:${title}`;
    let log = loggersByTitle[title];
    if (!log) {
      log = debug(title);
      loggersByTitle[title] = log;
      // errors with red, warnings with yellow.
      if (title.endsWith('error')) {
        log.color = colors.red;
      } else if (title.endsWith('warn')) {
        log.color = colors.yellow;
      }
    }
    return log;
  }

  /**
   * @param {string} level
   */
  static setLevel(level) {
    level_ = level;
    switch (level) {
      case 'silent':
        debug.enable('-LH:*');
        break;
      case 'verbose':
        debug.enable('LH:*');
        break;
      case 'error':
        debug.enable('-LH:*, LH:*:error');
        break;
      default:
        debug.enable('LH:*, -LH:*:verbose');
    }
  }

  /**
   * A simple formatting utility for event logging.
   * @param {string} prefix
   * @param {!Object} data A JSON-serializable object of event data to log.
   * @param {string=} level Optional logging level. Defaults to 'log'.
   */
  static formatProtocol(prefix, data, level) {
    const columns = (!process || process.browser) ? Infinity : process.stdout.columns;
    const method = data.method || '?????';
    const maxLength = columns - method.length - prefix.length - loggingBufferColumns;
    // IO.read ignored here to avoid logging megabytes of trace data
    const snippet = (data.params && method !== 'IO.read') ?
      JSON.stringify(data.params).substr(0, maxLength) : '';
    Log._logToStdErr(`${prefix}:${level || ''}`, [method, snippet]);
  }

  /**
   * @return {boolean}
   */
  static isVerbose() {
    return level_ === 'verbose';
  }

  static time({msg, id, args = []}, level = 'log') {
    marky.mark(id);
    Log[level]('status', msg, ...args);
  }

  static timeEnd({msg, id, args = []}, level = 'verbose') {
    Log[level]('statusEnd', msg, ...args);
    marky.stop(id);
  }

  static log(title, ...args) {
    Log.events.issueStatus(title, args);
    return Log._logToStdErr(title, args);
  }

  static warn(title, ...args) {
    Log.events.issueWarning(title, args);
    return Log._logToStdErr(`${title}:warn`, args);
  }

  static error(title, ...args) {
    return Log._logToStdErr(`${title}:error`, args);
  }

  static verbose(title, ...args) {
    Log.events.issueStatus(title, args);
    return Log._logToStdErr(`${title}:verbose`, args);
  }

  /**
   * Add surrounding escape sequences to turn a string green when logged.
   * @param {string} str
   * @return {string}
   */
  static greenify(str) {
    return `${Log.green}${str}${Log.reset}`;
  }

  /**
   * Add surrounding escape sequences to turn a string red when logged.
   * @param {string} str
   * @return {string}
   */
  static redify(str) {
    return `${Log.red}${str}${Log.reset}`;
  }

  static get green() {
    return '\x1B[32m';
  }

  static get red() {
    return '\x1B[31m';
  }

  static get yellow() {
    return '\x1b[33m';
  }

  static get purple() {
    return '\x1b[95m';
  }

  static get reset() {
    return '\x1B[0m';
  }

  static get bold() {
    return '\x1b[1m';
  }

  static get dim() {
    return '\x1b[2m';
  }

  static get tick() {
    return isWindows ? '\u221A' : '✓';
  }

  static get cross() {
    return isWindows ? '\u00D7' : '✘';
  }

  static get whiteSmallSquare() {
    return isWindows ? '\u0387' : '▫';
  }

  static get heavyHorizontal() {
    return isWindows ? '\u2500' : '━';
  }

  static get heavyVertical() {
    return isWindows ? '\u2502 ' : '┃ ';
  }

  static get heavyUpAndRight() {
    return isWindows ? '\u2514' : '┗';
  }

  static get heavyVerticalAndRight() {
    return isWindows ? '\u251C' : '┣';
  }

  static get heavyDownAndHorizontal() {
    return isWindows ? '\u252C' : '┳';
  }

  static get doubleLightHorizontal() {
    return '──';
  }
}

Log.events = new Emitter();
Log.takeTimeEntries = () => {
  const entries = marky.getEntries();
  marky.clear();
  return entries;
};
Log.getTimeEntries = () => marky.getEntries();

module.exports = Log;


/***/ }),

/***/ 152:
/***/ ((__unused_webpack_module, exports) => {

"use strict";


Object.defineProperty(exports, "__esModule", ({ value: true }));

/* global performance */
var perf = typeof performance !== 'undefined' && performance;

var nowForNode;

{
  // implementation borrowed from:
  // https://github.com/myrne/performance-now/blob/6223a0d544bae1d5578dd7431f78b4ec7d65b15c/src/performance-now.coffee
  var hrtime = process.hrtime;
  var getNanoSeconds = function () {
    var hr = hrtime();
    return hr[0] * 1e9 + hr[1]
  };
  var loadTime = getNanoSeconds();
  nowForNode = function () { return ((getNanoSeconds() - loadTime) / 1e6); };
}

var now = nowForNode;

function throwIfEmpty (name) {
  if (!name) {
    throw new Error('name must be non-empty')
  }
}

// simple binary sort insertion
function insertSorted (arr, item) {
  var low = 0;
  var high = arr.length;
  var mid;
  while (low < high) {
    mid = (low + high) >>> 1; // like (num / 2) but faster
    if (arr[mid].startTime < item.startTime) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  arr.splice(low, 0, item);
}

exports.mark = void 0;
exports.stop = void 0;
exports.getEntries = void 0;
exports.clear = void 0;

if (
  perf &&
  perf.mark &&
  perf.getEntriesByName &&
  perf.getEntriesByType &&
  perf.clearMeasures
) {
  exports.mark = function (name) {
    throwIfEmpty(name);
    perf.mark(("start " + name));
  };
  exports.stop = function (name) {
    throwIfEmpty(name);
    perf.mark(("end " + name));
    perf.measure(name, ("start " + name), ("end " + name));
    var entries = perf.getEntriesByName(name);
    return entries[entries.length - 1]
  };
  exports.getEntries = function () { return perf.getEntriesByType('measure'); };
  exports.clear = function () {
    perf.clearMarks();
    perf.clearMeasures();
  };
} else {
  var marks = {};
  var entries = [];
  exports.mark = function (name) {
    throwIfEmpty(name);
    var startTime = now();
    marks['$' + name] = startTime;
  };
  exports.stop = function (name) {
    throwIfEmpty(name);
    var endTime = now();
    var startTime = marks['$' + name];
    if (!startTime) {
      throw new Error(("no known mark: " + name))
    }
    var entry = {
      startTime: startTime,
      name: name,
      duration: endTime - startTime,
      entryType: 'measure'
    };
    // per the spec this should be at least 150:
    // https://www.w3.org/TR/resource-timing-1/#extensions-performance-interface
    // we just have no limit, per Chrome and Edge's de-facto behavior
    insertSorted(entries, entry);
    return entry
  };
  exports.getEntries = function () { return entries; };
  exports.clear = function () {
    marks = {};
    entries = [];
  };
}


/***/ }),

/***/ 93:
/***/ ((module) => {

/**
 * Helpers.
 */

var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var y = d * 365.25;

/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} [options]
 * @throws {Error} throw an error if val is not a non-empty string or a number
 * @return {String|Number}
 * @api public
 */

module.exports = function(val, options) {
  options = options || {};
  var type = typeof val;
  if (type === 'string' && val.length > 0) {
    return parse(val);
  } else if (type === 'number' && isNaN(val) === false) {
    return options.long ? fmtLong(val) : fmtShort(val);
  }
  throw new Error(
    'val is not a non-empty string or a valid number. val=' +
      JSON.stringify(val)
  );
};

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str) {
  str = String(str);
  if (str.length > 100) {
    return;
  }
  var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(
    str
  );
  if (!match) {
    return;
  }
  var n = parseFloat(match[1]);
  var type = (match[2] || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'yrs':
    case 'yr':
    case 'y':
      return n * y;
    case 'days':
    case 'day':
    case 'd':
      return n * d;
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      return n * h;
    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      return n * m;
    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      return n * s;
    case 'milliseconds':
    case 'millisecond':
    case 'msecs':
    case 'msec':
    case 'ms':
      return n;
    default:
      return undefined;
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function fmtShort(ms) {
  if (ms >= d) {
    return Math.round(ms / d) + 'd';
  }
  if (ms >= h) {
    return Math.round(ms / h) + 'h';
  }
  if (ms >= m) {
    return Math.round(ms / m) + 'm';
  }
  if (ms >= s) {
    return Math.round(ms / s) + 's';
  }
  return ms + 'ms';
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function fmtLong(ms) {
  return plural(ms, d, 'day') ||
    plural(ms, h, 'hour') ||
    plural(ms, m, 'minute') ||
    plural(ms, s, 'second') ||
    ms + ' ms';
}

/**
 * Pluralization helper.
 */

function plural(ms, n, name) {
  if (ms < n) {
    return;
  }
  if (ms < n * 1.5) {
    return Math.floor(ms / n) + ' ' + name;
  }
  return Math.ceil(ms / n) + ' ' + name + 's';
}


/***/ }),

/***/ 129:
/***/ ((module) => {

"use strict";
module.exports = require("child_process");

/***/ }),

/***/ 614:
/***/ ((module) => {

"use strict";
module.exports = require("events");

/***/ }),

/***/ 747:
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),

/***/ 605:
/***/ ((module) => {

"use strict";
module.exports = require("http");

/***/ }),

/***/ 631:
/***/ ((module) => {

"use strict";
module.exports = require("net");

/***/ }),

/***/ 87:
/***/ ((module) => {

"use strict";
module.exports = require("os");

/***/ }),

/***/ 622:
/***/ ((module) => {

"use strict";
module.exports = require("path");

/***/ }),

/***/ 867:
/***/ ((module) => {

"use strict";
module.exports = require("tty");

/***/ }),

/***/ 669:
/***/ ((module) => {

"use strict";
module.exports = require("util");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId].call(module.exports, module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {

__nccwpck_require__(105).launch({
  chromeFlags: ['--disable-web-security'],
});

})();

module.exports = __webpack_exports__;
/******/ })()
;