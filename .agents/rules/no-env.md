# Environment Files Protection Rule

- **Do NOT read, inspect, or write `.env` files**: Under no circumstances should agent tools (`view_file`, `replace_file_content`, `multi_replace_file_content`, `write_to_file`, `grep_search`, `cat`, `head`, `tail`, etc.) be used to access or modify `.env` files containing live secrets, keys, or credentials.
- **Always use `.env.example`** as the canonical template for environment variable configurations and documentation.
- When assisting users with setup, instruct them to copy `.env.example` to `.env` and fill in their secrets manually.
