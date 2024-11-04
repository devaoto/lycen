# LYCEN API Documentation

**Overview:**  
LYCEN API provides a comprehensive anime database with thousands of titles, including advanced features like anime mapping and search functionalities.

**Note:** This API is not intended for self-hosting due to its complex infrastructure.

**Base URL:** `https://api.ayoko.fun`

## Key Features
- Extensive anime database
- Detailed anime and character metadata
- Episode information
- Advanced search and filtering options

## Usage Guide

**Development Status:**  
The API is currently in development, with additional features and refinements underway.

### Endpoints

#### Get Anime Information
- **Route:** `/info/:id`  
- **Description:** Retrieves information about an anime by its AniList ID.

#### Search Anime
- **Route:** `/search`  
- **Description:** Returns search results with pagination.
- **Query Parameters:**
  1. `q` - Search keyword
  2. `genres` - Filter by specific genres
  3. `tags` - Filter by specific tags
  4. `season` - Filter by specific seasons
  5. `status` - Filter by anime status (only completed or canceled anime are permanently stored; others are cached)
  6. `fields` - Specify required fields in the response

## Roadmap
- [x] Anime mappings
- [x] Anime information retrieval
- [x] Anime search functionality
- [ ] Seasonal anime data
- [ ] Anime skip times
- [ ] Full character metadata
- [ ] Anime episode streaming
