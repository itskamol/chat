FROM nginx:alpine

# NGINX konfiguratsiya faylini nusxalash
COPY nginx.conf /etc/nginx/nginx.conf

# SSL sertifikatlar uchun papka yaratish (keyinchalik uchun)
RUN mkdir -p /etc/nginx/ssl

# NGINX foydalanuvchisi va huquqlarini sozlash
RUN chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d

# NGINX ishga tushirish
EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]