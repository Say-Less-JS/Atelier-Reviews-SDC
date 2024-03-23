import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 1000 },
    { duration: '15s', target: 1000 },
    { duration: '5s', target: 0 },
  ],
};

export default function() {
  const random = Math.floor(Math.random() * 40000);
  http.get(`http://localhost:3000/metas/${random}`);
  sleep(1);
}