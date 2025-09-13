import com.microsoft.playwright.*;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpExchange;

import java.io.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

public class Main {
    private static final Gson GSON = new Gson();
    private static List<Integer> lastColorIds = new ArrayList<>();

    public static void main(String[] args) {
        try {
            HttpServer server = HttpServer.create(new InetSocketAddress(14321), 0);
            server.createContext("/atr", new Handler());
            server.setExecutor(null);
            server.start();
        } catch (IOException e) {
            return;
        }

        try (Playwright playwright = Playwright.create()) {
            String wordyScript = loadResource("wordy.js");
            String caboScript = loadResource("cabo.js");
            String scribbleWords = loadResource("scribbleWords.json");
            String placeholder = "`__INJECT_JSON_HERE__`";
            String scribbleScript = loadResource("scribble.js").replace(placeholder, "`" + scribbleWords + "`");
            String initScript = wordyScript + caboScript + scribbleScript;

            Browser browser = connectToBrowser(playwright);
            if (browser == null) return;
            browser.contexts().getFirst().addInitScript(initScript);
            Thread.currentThread().join();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private static class Handler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!"/atr".equals(exchange.getRequestURI().getPath())) {
                exchange.sendResponseHeaders(404, 0);
                exchange.getResponseBody().close();
                return;
            }

            String query = exchange.getRequestURI().getQuery();

            if ("POST".equals(exchange.getRequestMethod()) && "v=2&id=6fe874ejfeoureph83374h".equals(query)) {
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(exchange.getRequestBody(), StandardCharsets.UTF_8))) {
                    String json = reader.lines().collect(Collectors.joining("\n"));
                    List<Integer> colorIds = GSON.fromJson(json, new TypeToken<List<Integer>>(){}.getType());
                    synchronized (Main.class) {
                        if (!colorIds.equals(lastColorIds)) {
                            shareBoard(colorIds);
                            lastColorIds = colorIds;
                        }
                    }
                    sendOk(exchange);
                }
            } else {
                exchange.sendResponseHeaders(404, 0);
                exchange.getResponseBody().close();
            }
        }

        private void sendOk(HttpExchange exchange) throws IOException {
            String response = "OK";
            exchange.sendResponseHeaders(200, response.length());
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(response.getBytes(StandardCharsets.UTF_8));
            }
        }
    }

    private static String loadResource(String resourceName) {
        try(InputStream is = Main.class.getClassLoader().getResourceAsStream(resourceName)) {
            if (is == null) throw new IOException();
            return new String(is.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            System.exit(1);
        }
        return "";
    }

    private static Browser connectToBrowser(Playwright playwright) {
        try {
            return playwright.chromium().connectOverCDP("http://127.0.0.1:9222");
        } catch (PlaywrightException e) {
            return null;
        }
    }

    private static void shareBoard(List<Integer> colorIds) {
        String[] idToColor = {" --- ", " Red ", " Blu ", "BLACK"};
        StringBuilder board = new StringBuilder();

        for (int i = 0; i < 5; i++) {
            board.append("[");
            for (int j = 0; j < 5; j++) {
                board.append(idToColor[colorIds.get(i * 5 + j)]);
            }
            board.append("]\n");
        }
        pushFile("6fe874ejfeoureph83374h.txt", board);
    }

    private static void pushFile(String name, StringBuilder data) {
        Path local = Paths.get(System.getProperty("java.io.tmpdir"), name);
        String remote = "/sdcard/Ringtones/" + name;
        ProcessBuilder pb = new ProcessBuilder("adb", "push", local.toString(), remote);
        pb.inheritIO();
        try {
            Files.writeString(local, data.toString(), StandardCharsets.UTF_8);
            Process p = pb.start();
            p.waitFor();
        } catch (IOException | InterruptedException ignored) {}
    }
}
