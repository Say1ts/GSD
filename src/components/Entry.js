class Entry {
    constructor(entryData, dayEntries = []) {
        this.time = entryData.time;
        this.sugar = entryData.sugar;
        this.insulin = entryData.insulin;
        this.comment = entryData.comment; // еда/комментарий
        this.breadUnits = entryData.breadUnits;
        this.date = entryData.date;
        this.dayEntries = dayEntries;
    }

    getInsulinTypeInRussian(type) {
        const types = {
            'novorapid': 'Новорапид',
            'levemir': 'Левемир'
        };
        return types[type.toLowerCase()] || type;
    }

    isHighSugar() {
        if (!this.sugar) return false;
        const sugarValue = parseFloat(this.sugar);
        const [h, m] = this.time.split(':').map(Number);
        // 1. Все сахара с 00:00 до 05:59
        if (h < 6) {
            return sugarValue > 6.9;
        }
        // 2. Первый сахар после 06:00 — натощак
        // Найдём среди всех записей с временем >= 06:00 минимальное время
        let minIdx = -1;
        let minTime = 24 * 60;
        for (let i = 0; i < this.dayEntries.length; i++) {
            const [hh, mm] = this.dayEntries[i].time.split(':').map(Number);
            if (hh >= 6) {
                const total = hh * 60 + mm;
                if (total < minTime) {
                    minTime = total;
                    minIdx = i;
                }
            }
        }
        if (minIdx !== -1 && this.dayEntries[minIdx].time === this.time) {
            return sugarValue > 5.0;
        }
        // 3. Остальные сахара — по обычной логике
        // Находим индекс текущей записи
        const currentIndex = this.dayEntries.findIndex(entry => entry.time === this.time);
        if (currentIndex === -1) return false;
        // Ищем предыдущую запись с едой
        let prevFoodIndex = -1;
        for (let i = currentIndex - 1; i >= 0; i--) {
            if (this.dayEntries[i].comment && this.dayEntries[i].comment.trim() !== "") {
                prevFoodIndex = i;
                break;
            }
        }
        // Если предыдущей записи с едой нет — обычный порог
        if (prevFoodIndex === -1) {
            return sugarValue > 5.0;
        }
        // Считаем разницу во времени между предыдущей едой и текущим замером
        const prevTime = this.timeToMinutes(this.dayEntries[prevFoodIndex].time);
        const currentTime = this.timeToMinutes(this.time);
        let timeDiff = currentTime - prevTime;
        if (timeDiff < 0) timeDiff += 24 * 60;
        if (timeDiff <= 70) {
            return sugarValue > 6.9;
        } else if (timeDiff <= 135) {
            return sugarValue > 6.7;
        } else {
            return sugarValue > 5.8;
        }
    }

    timeToMinutes(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    }

    shouldShowDivider() {
        if (!this.comment) {
            return false;
        }

        // Находим индекс текущей записи
        const currentIndex = this.dayEntries.findIndex(entry => 
            entry.time === this.time
        );

        // Если это первая запись дня, не показываем разделитель
        return currentIndex > 0;
    }

    createElement() {
        const note = document.createElement('div');
        note.classList.add('note', 'entry');  // Добавляем класс entry для идентификации

        // Добавляем divider если нужно
        if (this.shouldShowDivider()) {
            const divider = document.createElement('div');
            divider.classList.add('entry-divider');
            note.appendChild(divider);
        }

        // Основная запись (data)
        const data = document.createElement('div');
        data.classList.add('data');

        // Контейнер для времени, сахара и инсулина
        const dataRow = document.createElement('div');
        dataRow.classList.add('data-row');

        // Время
        const timeContainer = document.createElement('div');
        timeContainer.classList.add('time-container');
        
        const timeIcon = document.createElement('img');
        timeIcon.src = 'icons/timer-14.svg';
        timeIcon.classList.add('timer-icon');
        timeContainer.appendChild(timeIcon);
        
        const timeText = document.createElement('span');
        timeText.textContent = this.time;
        timeContainer.appendChild(timeText);
        
        dataRow.appendChild(timeContainer);

        // Сахар и инсулин
        const hasBadges = this.sugar !== undefined || (this.insulin && this.insulin.type) || (this.breadUnits && this.breadUnits > 0);
        if (hasBadges) {
            if (this.sugar !== undefined && this.sugar !== null && this.sugar !== '') {
                const sugarBadge = document.createElement('div');
                // Новое условие: если сахар <= 3.8 — чёрный
                const sugarValue = parseFloat(this.sugar);
                let sugarClass = 'normal';
                let sugarIcon = 'green';
                if (sugarValue <= 3.8) {
                    sugarClass = 'black';
                    sugarIcon = 'red';
                } else {
                    const isHigh = this.isHighSugar();
                    sugarClass = isHigh ? 'high' : 'normal';
                    sugarIcon = isHigh ? 'red' : 'green';
                }
                sugarBadge.classList.add('sugar-badge', sugarClass);
                const sugarIconImg = document.createElement('img');
                sugarIconImg.src = `icons/sugar-14-${sugarIcon}.svg`;
                sugarIconImg.classList.add('sugar-icon');
                sugarBadge.appendChild(sugarIconImg);
                const sugarText = document.createElement('span');
                sugarText.textContent = this.sugar;
                sugarBadge.appendChild(sugarText);
                dataRow.appendChild(sugarBadge);
            }

            if (this.insulin && this.insulin.type) {
                const insulinBadge = document.createElement('div');
                insulinBadge.classList.add('insulin-badge', this.insulin.type.toLowerCase());
                
                const insulinIcon = document.createElement('img');
                insulinIcon.src = 'icons/insulin-14.svg';
                insulinIcon.classList.add('insulin-icon');
                insulinBadge.appendChild(insulinIcon);
                
                const insulinText = document.createElement('span');
                const insulinType = this.getInsulinTypeInRussian(this.insulin.type);
                insulinText.innerHTML = `${insulinType} <b>${this.insulin.units} ед.</b>`;
                insulinBadge.appendChild(insulinText);
                
                dataRow.appendChild(insulinBadge);
            }

            if (this.breadUnits && this.breadUnits > 0) {
                const breadBadge = document.createElement('div');
                breadBadge.classList.add('bread-badge');
                const breadText = document.createElement('span');
                breadText.innerHTML = `<b>${this.breadUnits} ХЕ</b>`;
                breadBadge.appendChild(breadText);
                dataRow.appendChild(breadBadge);
            }
        }

        // Кнопка "ещё"
        const moreButton = document.createElement('button');
        moreButton.className = 'more-btn';
        moreButton.innerHTML = '<img src="icons/more_vert.svg" alt="Ещё">';
        dataRow.appendChild(moreButton);

        data.appendChild(dataRow);

        // Еда (если есть)
        if (this.comment) {
            const foodContainer = document.createElement('div');
            foodContainer.classList.add('food-container');

            if (hasBadges) {
                // Для записи с сахаром/инсулином добавляем вертикальную линию
                const line = document.createElement('div');
                line.classList.add('food-line');
                foodContainer.appendChild(line);
            }

            const foodText = document.createElement('div');
            foodText.classList.add('entry-food');
            foodText.textContent = this.comment;
            foodContainer.appendChild(foodText);
            data.appendChild(foodContainer);
        }

        note.appendChild(data);
        return note;
    }
} 