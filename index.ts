import fs from 'fs';
import csv from 'csv-parser';
import axios, { AxiosInstance, AxiosResponse } from 'axios';

interface Movie {
  title: string;
  studio: string; // Nome do estúdio
  audience_score: string;
  year: string;
  genre: string; // Nome do gênero
}

interface CreateMovieDto {
  title: string;
  audience_score: string;
  year: number;
  id_studio: string;
  id_genre: string;
}

interface Studio {
  id_studio: string;
  studio: string;
}

interface Genre {
  id_genre: string;
  genre: string;
}

const baseUrl = "http://localhost:3001/";

const http: AxiosInstance = axios.create({
  baseURL: baseUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

const movies: Movie[] = [];

fs.createReadStream('movies.csv')
  .pipe(csv())
  .on('data', (row: any) => {
    movies.push({
      title: row.Film,
      studio: row['Lead Studio'],
      audience_score: row['Audience score %'],
      year: row.Year,
      genre: row.Genre,
    });
  })
  .on('end', () => {
    // console.log('CSV file successfully processed.');
    // console.log(movies);
    createMovies();
  });

async function createMovies(): Promise<void> {
  try {
    // Obter os IDs dos gêneros e estúdios

    const genres: Record<string, string> = {};
    let studios: Record<string, string> = {};
    // movies.forEach((movie) => {
    //   http.post<Genre>('/genre', { genre: movie.genre }).then(data => { genres[data.data.genre] = data.data.id }).catch(e => console.log(e));
    // });

    // movies.forEach((movie) => {
    //   http.post<Studio>('/studio', { studio: movie.studio }).then(data => { studios[data.data.studio] = data.data.id }).catch(e => console.log(e))
    // });

    http.get<Genre[]>('/genre').then(async (data) => {

      data.data.forEach(genre => { genres[genre.genre] = genre.id_genre });

      http.get<Studio[]>('/studio').then(async (dataStudio) => {

        dataStudio.data.forEach(studio => { studios[studio.studio] = studio.id_studio });

        const moviesToCreate: CreateMovieDto[] = movies.map(movie => ({
          title: movie.title,
          audience_score: movie.audience_score,
          year: parseInt(movie.year),
          id_studio: studios[movie.studio],
          id_genre: genres[movie.genre],
        }));

        moviesToCreate.forEach(async (movieToCreate) => {
          const createMoviesResponse: AxiosResponse<void> = await http.post('/movie', movieToCreate);
          console.log('Filmes criados:', createMoviesResponse.data);
        })

      });
    });
  } catch (error) {
    console.error('Erro ao criar filmes:', error);
  }
}
