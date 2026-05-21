type MonacoInstance = typeof import("monaco-editor");

type MonacoWindow = Window &
  typeof globalThis & {
    monaco?: MonacoInstance;
  };

interface LoaderConfig {
  monaco?: MonacoInstance;
}

interface CancelablePromise<T> extends Promise<T> {
  cancel: () => void;
}

const loaderState: {
  monaco: MonacoInstance | null;
  isInitialized: boolean;
  resolve: ((value: MonacoInstance) => void) | null;
  reject: ((reason?: unknown) => void) | null;
} = {
  monaco: null,
  isInitialized: false,
  resolve: null,
  reject: null,
};

const wrapperPromise = new Promise<MonacoInstance>((resolve, reject) => {
  loaderState.resolve = resolve;
  loaderState.reject = reject;
});

function makeCancelable<T>(promise: Promise<T>): CancelablePromise<T> {
  let cancelled = false;

  const wrapped = new Promise<T>((resolve, reject) => {
    promise.then(
      (value) => {
        if (cancelled) {
          reject({
            type: "cancelation",
            msg: "operation is manually canceled",
          });
          return;
        }

        resolve(value);
      },
      (error) => reject(error),
    );
  }) as CancelablePromise<T>;

  wrapped.cancel = () => {
    cancelled = true;
  };

  return wrapped;
}

function storeMonacoInstance(monaco: MonacoInstance): void {
  loaderState.monaco = monaco;
}

function getGlobalMonacoInstance(): MonacoInstance | null {
  const monacoWindow = window as MonacoWindow;

  return monacoWindow.monaco?.editor ? monacoWindow.monaco : null;
}

function config(params: LoaderConfig): void {
  if (params.monaco) {
    storeMonacoInstance(params.monaco);
  }
}

function init(): CancelablePromise<MonacoInstance> {
  if (!loaderState.isInitialized) {
    loaderState.isInitialized = true;

    if (loaderState.monaco) {
      loaderState.resolve?.(loaderState.monaco);
    } else {
      const globalMonaco = getGlobalMonacoInstance();

      if (globalMonaco) {
        storeMonacoInstance(globalMonaco);
        loaderState.resolve?.(globalMonaco);
      } else {
        loaderState.reject?.(
          new Error(
            "Monaco instance is not configured for the local loader shim.",
          ),
        );
      }
    }
  }

  return makeCancelable(wrapperPromise);
}

function __getMonacoInstance(): MonacoInstance | null {
  return loaderState.monaco;
}

const loader = {
  config,
  init,
  __getMonacoInstance,
};

export default loader;
