import { Component, OnInit } from '@angular/core';
import { HttpService } from 'src/app/services/http.service';
import { Command } from 'src/app/models/Command';

@Component({
  selector: 'app-commands-list',
  templateUrl: './commands-list.component.html',
  styleUrls: ['./commands-list.component.scss']
})
export class CommandsListComponent implements OnInit {

  commands: Command[];

  constructor(
    private httpService: HttpService
  ) { }

  ngOnInit(): void {
    this.httpService.get('commands').toPromise().then(commands => {
      commands.forEach(cmd => cmd.activated = true);
      this.commands = commands;
    });
  }

  selectedCommands() {
    return this.commands.filter(command => command.activated === true);
  }

}
