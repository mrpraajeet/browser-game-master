#!/bin/bash

WORDLIST_IN="scribbleWords.txt"
WORDMAP_OUT="scribbleWords.json"

awk '
{
    gsub(/^[ \t]+|[ \t]+$/, "", $0);
    if (length($0) == 0) next;

    original_word = $0;
    key = $0;
    gsub(/[^ -]/, "x", key);
    while (match(key, /x+/)) {
        len = RLENGTH;
        key = substr(key, 1, RSTART - 1) len substr(key, RSTART + RLENGTH);
    }

    if (key in words) {
        words[key] = words[key] "%%%" original_word;
    } else {
        words[key] = original_word;
    }
}
END {
    printf "{\n";
    first_key = 1;
    for (key in words) {
        if (!first_key) printf ",\n";
        first_key = 0;

        json_key = key;
        gsub(/\\/, "\\\\", json_key);
        gsub(/"/, "\\\"", json_key);

        printf "  \"%s\": [", json_key;
        n = split(words[key], word_array, "%%%");

        for (i = 1; i <= n; i++) {
            json_word = word_array[i];
            gsub(/\\/, "\\\\", json_word);
            gsub(/"/, "\\\"", json_word);
            printf "\"%s\"%s", json_word, (i < n ? ", " : "");
        }
        printf "]";
    }
    printf "\n}\n";
}
' "$WORDLIST_IN" | jq 'with_entries(select(.value | length > 0)) | to_entries | sort_by(.key) | from_entries' > "$WORDMAP_OUT"
