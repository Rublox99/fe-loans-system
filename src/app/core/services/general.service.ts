import { Injectable } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';

@Injectable({
    providedIn: 'root'
})
export class GeneralService {
    constructor(
        private message: NzMessageService,
    ) { }

    debounce(func: any, timeout = 300) {
        let timer: any

        return (...args: any) => {
            clearTimeout(timer)
            timer = setTimeout(() => {
                func.apply(this, args)
            }, timeout)
        }
    }

    createMessage(type: 'error' | 'success', message: string) {
        this.message.create(type, message, { nzDuration: 3000 })
    }
}
