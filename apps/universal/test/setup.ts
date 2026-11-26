import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { resetWebViews } from "./stubs/react-native-webview";

afterEach(() => { cleanup(); resetWebViews(); });
