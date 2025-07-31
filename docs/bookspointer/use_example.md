# bookspointer

A package for scraping and serving book data.

## Installation

```bash
pip install bookspointer
```

## Usage

Import and use the modules in your Python code:

````python
from bookspointer.scraper import BookScraper
from bookspointer.server import BookAPI, AuthorAPI, TokenAPI
from bookspointer.sheet import AuthorSheetManager
from bookspointer.api import BookspointerAPI

from rich import print
import random

# Initialize the main classes
scraper = BookScraper()  # Categories to scrape by single page
book_api = BookAPI()
author_api = AuthorAPI()


def update_authors_from_bookspointer():
    """
    Fetches authors from a Google Sheet using AuthorSheetManager and updates them on the server.
    """
    # Fetch and update authors from Google Sheet to your server
    author_sheet = AuthorSheetManager().run()


def update_books_from_authors():
    """
    Fetches unscraped authors from the server, scrapes their books, adds the books to the server, and marks authors as scraped.
    """
    # Fetch unscraped authors and update their books
    authors = author_api.get_unscraped_authors()
    for author in authors:
        author_url = author.get('author_link')
        author_name = author.get('author_name', 'Unknown')
        author_id = author.get('author_id')
        if not author_url:
            continue
        books = scraper.get_book_list(author_url)
        for book in books:
            book_list = scraper.get_book_details(book, author_id)
            for book in book_list:
                add_book = book_api.create(book)
                print(
                    f"Added book: {book['title']} by {author_name} with ID: {add_book}")

            author_api.update(author.get('id'), {"is_scraped": "yes"})

        print(f"Finished scraping books for author: {author_name}")


def update_books_multi_page():
    """
    Updates books from a multi-page source by reading book information from a text file.

    This function reads a 'multi_page.txt' file that contains book information in a specific format.
    Each line in the file should contain an author ID and a book link separated by a comma.

    File Format Example (multi_page.txt):
    ```
    123,https://www.examplelibrary.com/books/1...
    456,https://www.examplelibrary.com/books/2...
    789,https://www.examplelibrary.com/books/3...
    ```

    Where:
    - First value: author_id (integer) - The ID of the author who wrote the book
    - Second value: link (string) - The URL link to the book's page

    The function will:
    1. Read the multi_page.txt file
    2. Parse each line to extract author_id and book link
    3. Scrape book details using the BookScraper
    4. Create book entries in the database
    5. Skip books that require login (empty content)

    Raises:
        FileNotFoundError: If 'multi_page.txt' file doesn't exist
        Exception: For other file reading errors

    Returns:
        None
    """
    print("Starting to update books from multi page...")
    try:
        with open('multi_page.txt', 'r', encoding='utf-8') as f:
            total_books = f.readlines()
            print(f"Total books: {len(total_books)}")
    except FileNotFoundError:
        print("Error: 'multi_page.txt' file not found. Please ensure the file exists in the current directory.")
        return
    except Exception as e:
        print(f"Error reading 'multi_page.txt': {e}")
        return

    for book in total_books:
        author_id, link = book.split(',')
        book_info = {
            'link': link.strip(),
            'title': 'Unknown',
            'author': 'Unknown'
        }
        print(book_info)
        book_list = scraper.get_book_details(author_id=int(
            author_id), book_info=book_info, multi_page=True)
        for book in book_list:
            if book['content'] == '':
                print(f'This book may have login required')
                continue
            add_book = book_api.create(book)

    print("Starting to post books on Bookspointer...")
    post_books_on_bookspointer()
    print("All books posted successfully.")


def post_books_on_bookspointer():
    """
    Posts all books that have not yet been posted to Bookspointer using random tokens for authentication.
    """
    books = book_api.get_all_books(is_posted=False)
    print(len(books))
    tokens = TokenAPI().get_all_tokens()
    for idx, book in enumerate(books, start=1):
        token = random.choice(tokens)
        bookspointer_api = BookspointerAPI(token)
        try:
            print(f"Processing book {idx}: {book.get('title', 'Unknown')}")
            bookspointer_api.post_book(book)
            print(
                f"Posted book: {book.get('title', 'Unknown')} with ID: {book.get('id', 'Unknown')}")
        except Exception as e:
            print(f"Error posting book {book.get('title', 'Unknown')}: {e}")
            continue


def main():
    """
    Orchestrates the process of updating authors, updating books, and posting books by calling the respective functions in sequence.
    """
    print("Starting to update authors from Bookspointer...")
    update_authors_from_bookspointer()
    print("Authors updated successfully.")
    print("Starting to update books from authors...")
    update_books_from_authors()
    print("Books updated successfully.")
    print("Starting to post books on Bookspointer...")
    post_books_on_bookspointer()
    print("All books posted successfully.")


if __name__ == "__main__":
    multi_page = input('Do you want to update books from multi page? (y/n)')
    if multi_page == 'y':
        multi_page = True
    else:
        multi_page = False
    if multi_page:
        update_books_multi_page()
    else:
        main()

````

## Multipage Features

The BookScraper supports advanced multipage book processing with the following capabilities:

### Single-Page vs Multi-Page Processing

The scraper can handle books in two different modes:

1. **Single-Page Mode** (`multi_page=False`):

   - Aggregates all content from multiple pages into a single book entry
   - Content from different pages is joined with HTML line breaks (`<br/>`)
   - Creates one database entry per book

2. **Multi-Page Mode** (`multi_page=True`):
   - Creates separate book entries for each content page
   - Each page becomes an individual book with its own title and content
   - Useful for books with distinct chapters or sections

### Key Features

- **Automatic Title Cleaning**: Removes Bangla number prefixes from book titles using regex
- **Content Extraction**: Extracts clean HTML content while removing interactive elements
- **Login Detection**: Automatically detects and skips books that require authentication
- **Error Handling**: Graceful handling of network errors and malformed content
- **Progress Tracking**: Real-time progress updates during scraping operations

### Usage Examples

```python
# Single-page processing (default)
book_details = scraper.get_book_details(book_info, author_id, multi_page=False)

# Multi-page processing
book_details = scraper.get_book_details(book_info, author_id, multi_page=True)
```

### File-Based Multi-Page Processing

For batch processing of multi-page books, use the `update_books_multi_page()` function with a `multi_page.txt` file:

```
# multi_page.txt format:
author_id,book_url
123,https://www.examplelibrary.com/books/book1
456,https://www.examplelibrary.com/books/book2
```

## Features

- Scrape book data from examplelibrary.com
- Multi-page book processing with content aggregation
- Automatic title cleaning and content extraction
- Serve book data via API
- Sync authors and books with Google Sheets
- Login detection and error handling
- Progress tracking and batch processing

## Project Links

- [Homepage](https://github.com/samircd4)
- [Repository](https://github.com/samircd4/bookspointer)

## License

MIT
