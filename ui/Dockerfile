# 1. Rasm sifatida Node.js tanlanadi
FROM node:18-alpine

# 2. Loyihani konteyner ichiga nusxalash
WORKDIR /app

# 3. package.json va package-lock.json fayllarni nusxalash
COPY package*.json ./

# 4. Bog‘liqliklarni o‘rnatish
RUN npm install --legacy-peer-deps

# 5. Barcha fayllarni konteynerga nusxalash
COPY . .

# 6. Next.js loyihasini build qilish
RUN npm run build

# 7. Portni ochish (default Next.js porti)
EXPOSE 3000

# 8. Loyihani start qilish
CMD ["npm", "start"]
